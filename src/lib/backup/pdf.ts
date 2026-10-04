import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { getDaysInRange, getDiaryDateRange } from '@/lib/db/diaryRepo';
import type { Db } from '@/lib/db/types';
import { formatDate, todayKey } from '@/lib/dates';
import { photoUri } from '@/lib/photos';

import { buildArchiveHtml, groupByIsoWeek } from './pdfHtml';

const THUMB_EDGE = 240;
const THUMB_QUALITY = 0.6;

export type PdfProgress = (done: number, total: number) => void;

async function thumbnail(fileName: string): Promise<string | null> {
  const src = new File(photoUri(fileName));
  if (!src.exists) return null;
  let image = await ImageManipulator.manipulate(src.uri).renderAsync();
  if (Math.max(image.width, image.height) > THUMB_EDGE) {
    image = await ImageManipulator.manipulate(image)
      .resize(image.width >= image.height ? { width: THUMB_EDGE } : { height: THUMB_EDGE })
      .renderAsync();
  }
  const saved = await image.saveAsync({ compress: THUMB_QUALITY, format: SaveFormat.JPEG, base64: true });
  new File(saved.uri).delete();
  return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : null;
}

/** Renders the whole diary (grouped by ISO week) to a PDF in the app cache. */
export async function exportAllAsPdf(db: Db, name: string, onProgress?: PdfProgress): Promise<File> {
  const range = await getDiaryDateRange(db);
  const today = todayKey();
  const days = range ? await getDaysInRange(db, range.first, range.last > today ? range.last : today) : [];
  const weeks = groupByIsoWeek(days, name);
  const files = [...new Set(weeks.flatMap((w) => w.days.flatMap((d) => d.meals.flatMap((m) => m.photos))))];

  const thumbs = new Map<string, string>();
  onProgress?.(0, files.length);
  for (const [i, f] of files.entries()) {
    const src = await thumbnail(f).catch(() => null);
    if (src) thumbs.set(f, src);
    onProgress?.(i + 1, files.length);
  }

  const html = buildArchiveHtml({ name, weeks, generatedAt: formatDate(today), photoSrc: (f) => thumbs.get(f) ?? null });
  const printed = await Print.printToFileAsync({ html });
  const dir = new Directory(Paths.cache, 'exports');
  if (!dir.exists) dir.create({ intermediates: true });
  const safeName = name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'Diary';
  const target = new File(dir, `FoodDiary_${safeName}_all_${today}.pdf`);
  if (target.exists) target.delete();
  await new File(printed.uri).move(target);
  return target;
}

export async function sharePdf(file: File): Promise<void> {
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Share food diary PDF' });
}
