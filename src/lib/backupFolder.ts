import { Directory } from 'expo-file-system';

import { describeFolderUri } from '@/lib/folderLabel';

export type PickedFolder = { uri: string; label: string };

function isCancel(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null;
  return err?.code === 'ERR_PICKER_CANCELLED' || /cancel/i.test(err?.message ?? '');
}

/**
 * Lets the user choose the backup folder (persistable SAF permission) and proves it is writable
 * with a probe file. Returns null if the user cancels the picker.
 */
export async function pickBackupFolder(): Promise<PickedFolder | null> {
  let dir: Directory;
  try {
    dir = await Directory.pickDirectoryAsync();
  } catch (e) {
    if (isCancel(e)) return null;
    throw e;
  }
  try {
    const probe = dir.createFile(`.fooddiary-probe-${Date.now()}`, 'text/plain');
    probe.write('ok');
    probe.delete();
  } catch {
    throw new Error('Food Diary cannot write to this folder. Please choose or create another folder, e.g. Documents/FoodDiary.');
  }
  return { uri: dir.uri, label: describeFolderUri(dir.uri) ?? dir.uri };
}

/** False when the folder was deleted or the permission was revoked. */
export function isFolderAccessible(uri: string): boolean {
  try {
    return new Directory(uri).exists;
  } catch {
    return false;
  }
}
