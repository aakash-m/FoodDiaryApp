import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getNotificationAccess, type NotificationAccess } from '@/lib/notifications/permissions';

/** Current notification permission, refreshed on screen focus and when the app returns to the foreground. */
export function useNotificationAccess(): NotificationAccess | null {
  const [access, setAccess] = useState<NotificationAccess | null>(null);
  const refresh = useCallback(() => {
    getNotificationAccess().then(setAccess, () => setAccess(null));
  }, []);

  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return access;
}
