import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { strFromU8, strToU8, Unzip, UnzipPassThrough, Zip, ZipPassThrough } from 'fflate';

import { SCHEMA_VERSION } from '@/lib/db/schema';
import type { Db } from '@/lib/db/types';
import { photoDir } from '@/lib/photos';

import { exportDiary, importDiary, type ImportCounts } from './diaryData';
import { BACKUP_DATA_FILE, BACKUP_PHOTO_DIR, backupFileName, BackupFormatError, isBackupFileName, parseBackup } from './format';

// SAF file handles break after a garbage collection (expo-file-system drops the ParcelFileDescriptor,
// Phase 0), so archives are streamed in the app cache and copied to/from the SAF folder in one go.

export type BackupProgress = (done: number, total: number) => void;
export type BackupResult = { fileName: string; sizeBytes: number; photos: number; missingPhotos: number };

const READ_CHUNK = 1024 * 1024;

function freshCacheDir(name: string): Directory {
  const dir = new Directory(Paths.cache, name);
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });
  return dir;
}

/** Writes a full backup ZIP (data.json + photos) into the SAF folder. */
export async function createBackup(
  db: Db,
  folderUri: string,
  meta: { name: string; appVersion: string },
  onProgress?: BackupProgress,
): Promise<BackupResult> {
  const data = await exportDiary(db, meta);
  const names = [...new Set(data.photos.map((p) => p.file_name))];
  const fileName = backupFileName(new Date());
  const staging = new File(freshCacheDir('backup-out'), fileName);
  staging.create();
  const handle = staging.open(FileMode.Truncate);
  let missingPhotos = 0;
  try {
    await new Promise<void>((resolve, reject) => {
      const zip = new Zip((err, chunk, final) => {
        if (err) return reject(err);
        handle.writeBytes(chunk);
        if (final) resolve();
      });
      const json = new ZipPassThrough(BACKUP_DATA_FILE);
      zip.add(json);
      json.push(strToU8(JSON.stringify(data)), true);
      (async () => {
        onProgress?.(0, names.length);
        for (const [i, name] of names.entries()) {
          const src = new File(photoDir(), name);
          if (src.exists) {
            // Photos are already JPEG: store them uncompressed.
            const entry = new ZipPassThrough(`${BACKUP_PHOTO_DIR}${name}`);
            zip.add(entry);
            entry.push(await src.bytes(), true);
          } else {
            missingPhotos++;
          }
          onProgress?.(i + 1, names.length);
        }
        zip.end();
      })().catch(reject);
    });
  } finally {
    handle.close();
  }
  const sizeBytes = staging.size;
  const folder = new Directory(folderUri);
  folder.list().find((e): e is File => e instanceof File && e.name === fileName)?.delete();
  await staging.copy(folder);
  staging.delete();
  return { fileName, sizeBytes, photos: names.length - missingPhotos, missingPhotos };
}

/** Lets the user pick a backup ZIP; null if cancelled. */
export async function pickBackupFile(initialFolderUri?: string | null): Promise<File | null> {
  const picked = await File.pickFileAsync({
    initialUri: initialFolderUri ?? undefined,
    mimeTypes: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  });
  return picked.result ?? null;
}

/**
 * Replaces the diary with a backup: unpacks photos into a staging folder, imports data.json in one
 * transaction, then swaps the photo folder. Nothing changes if the archive is invalid.
 */
export async function restoreBackup(db: Db, backup: File, onProgress?: BackupProgress): Promise<ImportCounts> {
  const work = freshCacheDir('backup-in');
  await backup.copy(work);
  const local = work.list().find((e): e is File => e instanceof File);
  if (!local) throw new BackupFormatError('The backup file could not be read.');

  const stagingPhotos = new Directory(Paths.document, 'photos-restore');
  if (stagingPhotos.exists) stagingPhotos.delete();
  stagingPhotos.create();

  const jsonParts: Uint8Array[] = [];
  let sawData = false;
  let photosWritten = 0;
  const total = local.size;
  const reader = local.open(FileMode.ReadOnly);
  try {
    const unzip = new Unzip((entry) => {
      if (entry.name === BACKUP_DATA_FILE) {
        sawData = true;
        entry.ondata = (err, chunk) => {
          if (err) throw err;
          jsonParts.push(chunk);
        };
        entry.start();
      } else if (entry.name.startsWith(BACKUP_PHOTO_DIR) && !entry.name.endsWith('/')) {
        const name = entry.name.slice(BACKUP_PHOTO_DIR.length);
        if (/[\\/]/.test(name) || name.startsWith('.')) return; // never write outside the staging folder
        const out = new File(stagingPhotos, name);
        out.create();
        const h = out.open(FileMode.Truncate);
        entry.ondata = (err, chunk, final) => {
          if (err) throw err;
          h.writeBytes(chunk);
          if (final) {
            h.close();
            photosWritten++;
          }
        };
        entry.start();
      }
    });
    unzip.register(UnzipPassThrough);
    let read = 0;
    for (;;) {
      const chunk = reader.readBytes(READ_CHUNK);
      read += chunk.length;
      const last = chunk.length < READ_CHUNK;
      unzip.push(chunk, last);
      onProgress?.(read, total);
      if (last) break;
      // Yield so the progress dialog can update on large archives.
      await new Promise((r) => setTimeout(r, 0));
    }
  } catch (e) {
    stagingPhotos.delete();
    throw e instanceof BackupFormatError ? e : new BackupFormatError('This file is not a valid Food Diary backup.');
  } finally {
    reader.close();
    work.delete();
  }

  try {
    if (!sawData) throw new BackupFormatError('This file is not a Food Diary backup.');
    let parsed: unknown;
    try {
      // Decode once at the end: a UTF-8 character can be split across chunks.
      const bytes = new Uint8Array(jsonParts.reduce((n, p) => n + p.length, 0));
      let offset = 0;
      for (const part of jsonParts) {
        bytes.set(part, offset);
        offset += part.length;
      }
      parsed = JSON.parse(strFromU8(bytes));
    } catch {
      throw new BackupFormatError('This backup is damaged (data.json is unreadable).');
    }
    const data = parseBackup(parsed, SCHEMA_VERSION);
    const counts = await importDiary(db, data);
    // Data is in; now swap the photo folders.
    const current = photoDir();
    const old = new Directory(Paths.document, 'photos-old');
    if (old.exists) old.delete();
    current.rename('photos-old');
    stagingPhotos.rename('photos');
    new Directory(Paths.document, 'photos-old').delete();
    return { ...counts, photos: Math.min(counts.photos, photosWritten) };
  } catch (e) {
    if (stagingPhotos.exists) stagingPhotos.delete();
    throw e;
  }
}

export type BackupFolderStats = { count: number; sizeBytes: number; latest: string | null };

/** Backups found in the folder (name pattern only). */
export function backupFolderStats(folderUri: string): BackupFolderStats {
  const files = new Directory(folderUri).list().filter((e): e is File => e instanceof File && isBackupFileName(e.name));
  const names = files.map((f) => f.name).sort();
  return { count: files.length, sizeBytes: files.reduce((n, f) => n + (f.size ?? 0), 0), latest: names[names.length - 1] ?? null };
}
