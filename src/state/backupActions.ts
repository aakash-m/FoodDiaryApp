import Constants from 'expo-constants';
import type { File } from 'expo-file-system';
import { useMemo } from 'react';

import { createBackup, restoreBackup, type BackupProgress, type BackupResult } from '@/lib/backup/archive';
import { isFolderAccessible } from '@/lib/backupFolder';
import { useDb } from '@/lib/db/DbProvider';
import type { ImportCounts } from '@/lib/backup/diaryData';
import { notifyDiaryChanged } from '@/state/diaryEvents';
import { useSettings, useUpdateSettings } from '@/state/settings';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export class NoBackupFolderError extends Error {
  override name = 'NoBackupFolderError';
  constructor() {
    super('Choose a backup folder first (Settings → Backup & restore → Backup folder).');
  }
}

export type RestoreResult = ImportCounts & { safetyBackup: BackupResult | null };

export function useBackupActions() {
  const db = useDb();
  const { name, backupDirUri } = useSettings();
  const update = useUpdateSettings();

  return useMemo(() => {
    const backupNow = async (onProgress?: BackupProgress): Promise<BackupResult> => {
      if (!backupDirUri || !isFolderAccessible(backupDirUri)) throw new NoBackupFolderError();
      const result = await createBackup(db, backupDirUri, { name, appVersion: APP_VERSION }, onProgress);
      await update({ lastBackupAt: new Date().toISOString() });
      return result;
    };

    /** Safety backup of the current diary (when a folder is available), then replace it with `file`. */
    const restore = async (file: File, onProgress?: (phase: 'safety' | 'restore', done: number, total: number) => void): Promise<RestoreResult> => {
      const safetyBackup =
        backupDirUri && isFolderAccessible(backupDirUri)
          ? await createBackup(db, backupDirUri, { name, appVersion: APP_VERSION }, (d, t) => onProgress?.('safety', d, t))
          : null;
      const counts = await restoreBackup(db, file, (d, t) => onProgress?.('restore', d, t));
      notifyDiaryChanged();
      return { ...counts, safetyBackup };
    };

    return { backupNow, restore };
  }, [db, name, backupDirUri, update]);
}
