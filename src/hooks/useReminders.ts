import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getDay } from '@/lib/db/diaryRepo';
import { useDb } from '@/lib/db/DbProvider';
import { todayKey } from '@/lib/dates';
import { applyReminderPlan, dismissDeliveredWaterReminders } from '@/lib/notifications/apply';
import { planReminders } from '@/lib/notifications/plan';
import { useDiaryVersion } from '@/state/diaryEvents';
import { useSettings } from '@/state/settings';

const SYNC_DELAY_MS = 600;
/** The first sync of each app process re-arms all alarms (see applyReminderPlan). */
let rearmed = false;

/**
 * Keeps scheduled reminders in line with settings and today's diary: re-plans on start, when the app
 * returns to the foreground, after every diary write and when reminder settings change.
 */
export function useReminderSync(): void {
  const db = useDb();
  const settings = useSettings();
  const version = useDiaryVersion();
  const { onboarded, waterReminder, waterStart, waterEnd, endOfDayReminder, endOfDayTime } = settings;
  const { backupOverdueReminder, lastBackupAt, onboardedAt, backupDirUri } = settings;
  const [resumeTick, setResumeTick] = useState(0);

  useEffect(() => {
    if (!onboarded) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const today = todayKey();
        const todayDay = await getDay(db, today);
        const plan = planReminders({
          settings: {
            waterReminder,
            waterStart,
            waterEnd,
            endOfDayReminder,
            endOfDayTime,
            backupOverdueReminder,
            lastBackupAt,
            onboardedAt,
            hasBackupFolder: !!backupDirUri,
          },
          now: new Date(),
          today,
          todayDay,
        });
        if (cancelled) return;
        await applyReminderPlan(plan, { rearm: !rearmed });
        rearmed = true;
        // The user is in the app now, so earlier water nudges are no longer useful.
        await dismissDeliveredWaterReminders();
      } catch (e) {
        console.warn('Reminder sync failed', e);
      }
    }, SYNC_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    db,
    version,
    resumeTick,
    onboarded,
    waterReminder,
    waterStart,
    waterEnd,
    endOfDayReminder,
    endOfDayTime,
    backupOverdueReminder,
    lastBackupAt,
    onboardedAt,
    backupDirUri,
  ]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setResumeTick((n) => n + 1);
    });
    return () => sub.remove();
  }, []);
}

/** Opens the screen a tapped reminder points to (also for taps that launched the app). */
export function useReminderTaps(): void {
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const key = `${response.notification.request.identifier}:${response.notification.date}`;
      if (handled.current === key) return;
      handled.current = key;
      // The last response survives restarts; clear it so the same tap isn't replayed on the next launch.
      Notifications.clearLastNotificationResponse();
      const url = response.notification.request.content.data?.url;
      // navigate (not push): switches to an existing tab like /mealtimes instead of stacking a copy.
      if (typeof url === 'string' && url.startsWith('/')) router.navigate(url as Href);
    };
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
