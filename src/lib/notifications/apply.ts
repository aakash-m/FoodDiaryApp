import * as Notifications from 'expo-notifications';

import { ensureReminderChannel, REMINDER_CHANNEL_ID } from './permissions';
import { REMINDER_ID_PREFIXES, reminderSignature, type PlannedReminder } from './plan';

const isOurs = (id: string) => REMINDER_ID_PREFIXES.some((p) => id.startsWith(p));

function toTrigger(r: PlannedReminder): Notifications.NotificationTriggerInput {
  return r.trigger.kind === 'daily'
    ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.trigger.hour, minute: r.trigger.minute, channelId: REMINDER_CHANNEL_ID }
    : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.trigger.at), channelId: REMINDER_CHANNEL_ID };
}

/**
 * Makes the scheduled reminders match the plan: cancels ones that are gone or changed, schedules
 * new or changed ones, and leaves identical ones alone (compared by a signature stored in `data`).
 */
export async function applyReminderPlan(plan: PlannedReminder[]): Promise<{ scheduled: number; cancelled: number }> {
  await ensureReminderChannel();
  const wanted = new Map(plan.map((r) => [r.id, r]));
  const existing = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => isOurs(n.identifier));

  let cancelled = 0;
  const keep = new Set<string>();
  for (const n of existing) {
    const target = wanted.get(n.identifier);
    if (target && n.content.data?.sig === reminderSignature(target)) {
      keep.add(n.identifier);
      continue;
    }
    await Notifications.cancelScheduledNotificationAsync(n.identifier);
    cancelled++;
  }

  let scheduled = 0;
  for (const r of plan) {
    if (keep.has(r.id)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: { url: r.url, sig: reminderSignature(r) } },
      trigger: toTrigger(r),
    });
    scheduled++;
  }
  return { scheduled, cancelled };
}

export const TEST_REMINDER_DELAY_S = 10;

/** One-off sample reminder, so users can check notifications work on their phone. */
export async function sendTestReminder(): Promise<void> {
  await ensureReminderChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Test reminder', body: 'Reminders are working. You can close this.', data: { url: '/settings/reminders' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: TEST_REMINDER_DELAY_S, channelId: REMINDER_CHANNEL_ID },
  });
}

/** Show reminders as banners even while the app is open. */
export function installNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
