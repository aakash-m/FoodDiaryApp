import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

export const REMINDER_CHANNEL_ID = 'reminders';

export type NotificationAccess = 'granted' | 'undetermined' | 'denied' | 'blocked';

/** Android 13+ shows the permission prompt only after a channel exists. */
export async function ensureReminderChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Reminders',
    description: 'Water reminders and the end-of-day check',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

function toAccess(p: Notifications.NotificationPermissionsStatus): NotificationAccess {
  if (p.granted) return 'granted';
  if (p.status === 'undetermined') return 'undetermined';
  return p.canAskAgain ? 'denied' : 'blocked';
}

export async function getNotificationAccess(): Promise<NotificationAccess> {
  return toAccess(await Notifications.getPermissionsAsync());
}

export async function requestNotificationAccess(): Promise<NotificationAccess> {
  await ensureReminderChannel();
  return toAccess(await Notifications.requestPermissionsAsync());
}

export function openAppSettings(): Promise<void> {
  return Linking.openSettings();
}
