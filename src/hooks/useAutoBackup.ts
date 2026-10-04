import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { isFolderAccessible } from '@/lib/backupFolder';
import { backupDueAt } from '@/lib/notifications/plan';
import { useBackupActions } from '@/state/backupActions';
import { useSettings, useUpdateSettings } from '@/state/settings';

/**
 * Backs up silently when the app is opened (or resumed) and the last backup is 7+ days old (PLAN.md §5).
 * Without a folder nothing happens here; the backup-overdue reminder asks the user to choose one.
 */
export function useAutoBackup(): void {
  const { onboarded, onboardedAt, lastBackupAt, backupDirUri } = useSettings();
  const update = useUpdateSettings();
  const { backupNow } = useBackupActions();
  const running = useRef(false);
  const [resumeTick, setResumeTick] = useState(0);

  // Installs from before onboardedAt existed: start the 7-day clock now.
  useEffect(() => {
    if (onboarded && !onboardedAt) void update({ onboardedAt: new Date().toISOString() });
  }, [onboarded, onboardedAt, update]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setResumeTick((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!onboarded || !backupDirUri || running.current) return;
    const due = lastBackupAt ? backupDueAt(lastBackupAt, null) : Date.now(); // never backed up: back up now
    if (due === null || due > Date.now()) return;
    if (!isFolderAccessible(backupDirUri)) return;
    running.current = true;
    backupNow()
      .catch((e) => console.warn('Automatic backup failed', e))
      .finally(() => {
        running.current = false;
      });
  }, [onboarded, backupDirUri, lastBackupAt, resumeTick, backupNow]);
}
