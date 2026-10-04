import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getDay } from '@/lib/db/diaryRepo';
import { useDb } from '@/lib/db/DbProvider';
import { todayKey } from '@/lib/dates';
import { applyReminderPlan } from '@/lib/notifications/apply';
import { planReminders } from '@/lib/notifications/plan';
import { useDiaryVersion } from '@/state/diaryEvents';
import { useSettings } from '@/state/settings';

const SYNC_DELAY_MS = 600;

/**
 * Keeps scheduled reminders in line with settings and today's diary: re-plans on start, when the app
 * returns to the foreground, after every diary write and when reminder settings change.
 */
export function useReminderSync(): void {
  const db = useDb();
  const settings = useSettings();
  const version = useDiaryVersion();
  const { onboarded, waterReminder, waterStart, waterEnd, endOfDayReminder, endOfDayTime } = settings;
  const [resumeTick, setResumeTick] = useState(0);

  useEffect(() => {
    if (!onboarded) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const today = todayKey();
        const todayDay = await getDay(db, today);
        const plan = planReminders({
          settings: { waterReminder, waterStart, waterEnd, endOfDayReminder, endOfDayTime },
          now: new Date(),
          today,
          todayDay,
        });
        if (!cancelled) await applyReminderPlan(plan);
      } catch (e) {
        console.warn('Reminder sync failed', e);
      }
    }, SYNC_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [db, version, resumeTick, onboarded, waterReminder, waterStart, waterEnd, endOfDayReminder, endOfDayTime]);

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
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
    };
    Notifications.getLastNotificationResponseAsync().then(open, () => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
