import { useSyncExternalStore } from 'react';

import { userName } from '@/mocks/diary';

// In-memory app state for the UI pass. Replaced by the SQLite settings table in Phase 1/2.

export type Settings = {
  onboarded: boolean;
  name: string;
  waterReminder: boolean;
  waterStart: string;
  waterEnd: string;
  endOfDayReminder: boolean;
  endOfDayTime: string;
  backupOverdueReminder: boolean;
  notificationsAllowed: boolean;
  backupFolder: string | null;
};

let state: Settings = {
  onboarded: false,
  name: userName,
  waterReminder: true,
  waterStart: '08:00',
  waterEnd: '22:00',
  endOfDayReminder: true,
  endOfDayTime: '22:30',
  backupOverdueReminder: true,
  notificationsAllowed: false,
  backupFolder: null,
};

const listeners = new Set<() => void>();

export function updateSettings(patch: Partial<Settings>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
