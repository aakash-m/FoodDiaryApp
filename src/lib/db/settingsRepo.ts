import type { DateKey } from '@/lib/dates';

import type { Db } from './types';

export type AppSettings = {
  onboarded: boolean;
  name: string;
  waterReminder: boolean;
  /** HH:mm, first water reminder of the day. */
  waterStart: string;
  /** HH:mm, last water reminder of the day. */
  waterEnd: string;
  endOfDayReminder: boolean;
  /** HH:mm */
  endOfDayTime: string;
  backupOverdueReminder: boolean;
  /** SAF tree URI of the chosen backup folder. */
  backupDirUri: string | null;
  /** ISO timestamp of the last successful backup. */
  lastBackupAt: string | null;
  /** Last day the end-of-day notification was scheduled for (avoids duplicates). */
  lastEodScheduledFor: DateKey | null;
  /** ISO timestamp when onboarding finished; anchors the first backup-overdue reminder. */
  onboardedAt: string | null;
  /** The user dismissed the battery-optimisation hint. */
  batteryHintDismissed: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  onboarded: false,
  name: '',
  waterReminder: true,
  waterStart: '08:00',
  waterEnd: '22:00',
  endOfDayReminder: true,
  endOfDayTime: '22:30',
  backupOverdueReminder: true,
  backupDirUri: null,
  lastBackupAt: null,
  lastEodScheduledFor: null,
  onboardedAt: null,
  batteryHintDismissed: false,
};

const KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[];

/** Stored values are JSON; unknown keys are ignored and malformed values fall back to the default. */
export async function getSettings(db: Db): Promise<AppSettings> {
  const rows = await db.all<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: AppSettings = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows) {
    if (!(KEYS as string[]).includes(key)) continue;
    const k = key as keyof AppSettings;
    try {
      const parsed: unknown = JSON.parse(value);
      const fallback = DEFAULT_SETTINGS[k];
      // Nullable settings (default null) hold a string or null; the rest must match their default's type.
      const valid = fallback === null ? parsed === null || typeof parsed === 'string' : typeof parsed === typeof fallback;
      if (valid) (settings as Record<string, unknown>)[k] = parsed;
    } catch {
      // keep default
    }
  }
  return settings;
}

export async function updateSettings(db: Db, patch: Partial<AppSettings>): Promise<AppSettings> {
  await db.transaction(async (tx) => {
    for (const [key, value] of Object.entries(patch)) {
      if (!(KEYS as string[]).includes(key) || value === undefined) continue;
      await tx.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
        key,
        JSON.stringify(value),
      );
    }
  });
  return getSettings(db);
}
