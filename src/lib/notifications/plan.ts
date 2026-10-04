import { missingItems, type DayCompletenessInput } from '@/lib/completeness';
import { addDays, fromKey, type DateKey } from '@/lib/dates';

// Pure reminder planning (PLAN.md §5). apply.ts turns the plan into scheduled notifications.

export type ReminderTrigger = { kind: 'daily'; hour: number; minute: number } | { kind: 'date'; at: number };

export type PlannedReminder = {
  /** Stable identifier, e.g. "water-0800" or "eod-2026-10-04". */
  id: string;
  title: string;
  body: string;
  trigger: ReminderTrigger;
  /** Route opened when the notification is tapped. */
  url: string;
};

export type ReminderSettings = {
  waterReminder: boolean;
  waterStart: string;
  waterEnd: string;
  endOfDayReminder: boolean;
  endOfDayTime: string;
  backupOverdueReminder?: boolean;
  /** ISO timestamp of the last backup, or null. */
  lastBackupAt?: string | null;
  /** ISO timestamp of onboarding; anchors the reminder when there is no backup yet. */
  onboardedAt?: string | null;
  hasBackupFolder?: boolean;
};

/** When the next backup is due: 7 days after the last one (or after onboarding). */
export function backupDueAt(lastBackupAt: string | null | undefined, onboardedAt: string | null | undefined): number | null {
  const anchor = lastBackupAt ?? onboardedAt;
  if (!anchor) return null;
  const t = Date.parse(anchor);
  return Number.isNaN(t) ? null : t + BACKUP_INTERVAL_DAYS * DAY_MS;
}

export const WATER_INTERVAL_MINUTES = 120;
/** End-of-day checks are pre-scheduled this many days ahead, so they still fire if the app isn't opened. */
export const EOD_DAYS_AHEAD = 7;
export const REMINDER_ID_PREFIXES = ['water-', 'eod-', 'backup-'] as const;
export const BACKUP_INTERVAL_DAYS = 7;
const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

export function parseTime(hhmm: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  const hour = m ? Number(m[1]) : NaN;
  const minute = m ? Number(m[2]) : NaN;
  if (!(hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59)) throw new Error(`Invalid time "${hhmm}"`);
  return { hour, minute };
}

/** Water reminder times every 2 hours from start to end (inclusive), e.g. 08:00, 10:00 … 22:00. */
export function waterTimes(start: string, end: string): { hour: number; minute: number }[] {
  const s = parseTime(start);
  const e = parseTime(end);
  const from = s.hour * 60 + s.minute;
  const to = e.hour * 60 + e.minute;
  const times: { hour: number; minute: number }[] = [];
  for (let t = from; t <= to; t += WATER_INTERVAL_MINUTES) times.push({ hour: Math.floor(t / 60), minute: t % 60 });
  return times;
}

/** "Lunch", "Lunch and Exercise", "Lunch, Snacks and Exercise" */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function planReminders(input: {
  settings: ReminderSettings;
  now: Date;
  today: DateKey;
  todayDay: DayCompletenessInput;
}): PlannedReminder[] {
  const { settings, now, today, todayDay } = input;
  const plan: PlannedReminder[] = [];

  if (settings.waterReminder) {
    for (const { hour, minute } of waterTimes(settings.waterStart, settings.waterEnd)) {
      plan.push({
        id: `water-${pad(hour)}${pad(minute)}`,
        title: 'Time for some water',
        body: 'Have a glass of water and note it in your Food Diary.',
        trigger: { kind: 'daily', hour, minute },
        // Repeats daily, so the link must not contain a date; the editor treats 'today' as today.
        url: '/day/today/water',
      });
    }
  }

  if (settings.endOfDayReminder) {
    const { hour, minute } = parseTime(settings.endOfDayTime);
    for (let i = 0; i <= EOD_DAYS_AHEAD; i++) {
      const date = addDays(today, i);
      const at = fromKey(date);
      at.setHours(hour, minute, 0, 0);
      if (at.getTime() <= now.getTime()) continue;
      if (i === 0) {
        const missing = missingItems(todayDay);
        if (missing.length === 0) continue; // today is complete: nothing to remind
        plan.push({
          id: `eod-${date}`,
          title: 'Your diary isn’t complete yet',
          body: `Still missing today: ${joinList(missing)}.`,
          trigger: { kind: 'date', at: at.getTime() },
          url: '/mealtimes',
        });
      } else {
        // Content is refreshed with the real missing items whenever the app is opened on that day.
        plan.push({
          id: `eod-${date}`,
          title: 'Your diary isn’t complete yet',
          body: 'Log today’s meals, water and exercise before bed.',
          trigger: { kind: 'date', at: at.getTime() },
          url: '/mealtimes',
        });
      }
    }
  }

  if (settings.backupOverdueReminder) {
    const due = backupDueAt(settings.lastBackupAt, settings.onboardedAt);
    if (due !== null) {
      let at = due;
      if (at <= now.getTime() + 60_000) {
        // Already overdue: nudge at the next 10:00 rather than right away.
        const next = new Date(now);
        next.setHours(10, 0, 0, 0);
        if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
        at = next.getTime();
      }
      plan.push({
        id: 'backup-overdue',
        title: 'Time to back up your diary',
        body: settings.hasBackupFolder
          ? 'Your last backup is more than a week old. Open Food Diary to back up now.'
          : 'Choose a backup folder so Food Diary can keep a copy of your diary safe.',
        trigger: { kind: 'date', at },
        url: '/settings/backup',
      });
    }
  }

  return plan;
}

/** Compact fingerprint of what a reminder shows and when, to skip re-scheduling unchanged ones. */
export function reminderSignature(r: PlannedReminder): string {
  return JSON.stringify([r.title, r.body, r.trigger, r.url]);
}
