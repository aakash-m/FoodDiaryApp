import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { newId } from '@/lib/ids';
import { fitWithin } from '@/lib/photoSize';

// Meal photos live in the app's private documents folder, referenced from SQLite by file name only.

const JPEG_QUALITY = 0.8;
/** Files younger than this are never treated as orphans (an editor may be about to save them). */
const ORPHAN_MIN_AGE_MS = 10 * 60 * 1000;

export function photoDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function photoUri(fileName: string): string {
  return new File(photoDir(), fileName).uri;
}

/** Resizes (if larger than 1600 px), re-encodes as JPEG and stores a picked image. Returns its file name. */
export async function importPhoto(source: { uri: string; width: number; height: number }): Promise<string> {
  const context = ImageManipulator.manipulate(source.uri);
  const target = fitWithin(source.width, source.height);
  if (target) context.resize(target);
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  const fileName = `${newId()}.jpg`;
  // Copy (not move) so the stored file is owned like a regular app file rather than counted as cache.
  const tempFile = new File(saved.uri);
  await tempFile.copy(new File(photoDir(), fileName));
  tempFile.delete();
  return fileName;
}

export function deletePhotoFiles(fileNames: Iterable<string>): void {
  for (const name of fileNames) {
    try {
      const f = new File(photoDir(), name);
      if (f.exists) f.delete();
    } catch (e) {
      console.warn('Could not delete photo', name, e);
    }
  }
}

/** Deletes photo files the database no longer references (left behind by a crash). Returns how many. */
export function cleanupOrphanPhotos(referenced: Iterable<string>, now = Date.now()): number {
  const keep = new Set(referenced);
  let removed = 0;
  for (const entry of photoDir().list()) {
    if (!(entry instanceof File) || keep.has(entry.name)) continue;
    const modified = entry.modificationTime ?? now;
    if (now - modified < ORPHAN_MIN_AGE_MS) continue;
    try {
      entry.delete();
      removed++;
    } catch {
      // try again next start
    }
  }
  return removed;
}
