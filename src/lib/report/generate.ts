import { Packer } from 'docx';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

import { getDaysInRange } from '@/lib/db/diaryRepo';
import type { Db } from '@/lib/db/types';
import type { DateKey } from '@/lib/dates';
import { photoUri } from '@/lib/photos';

import { buildReportDocument, type BuildProgress, type LoadedPhoto } from './docx';
import { buildReportModel, type ReportModel } from './model';

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Photos are embedded at this size (PLAN.md §3); stored photos stay at 1600 px. */
const REPORT_PHOTO_EDGE = 800;
const REPORT_JPEG_QUALITY = 0.75;
const FLAG_GRANT_READ_URI_PERMISSION = 1;

export class NoDocxViewerError extends Error {
  override name = 'NoDocxViewerError';
  constructor() {
    super('No app on this phone can open Word documents. Share the report instead, or install Word or Google Docs.');
  }
}

function reportsDir(): Directory {
  const dir = new Directory(Paths.cache, 'reports');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Downscales one stored photo to 800 px JPEG bytes for embedding; null if the file is gone. */
async function loadReportPhoto(fileName: string): Promise<LoadedPhoto | null> {
  const source = new File(photoUri(fileName));
  if (!source.exists) return null;
  let image = await ImageManipulator.manipulate(source.uri).renderAsync();
  if (Math.max(image.width, image.height) > REPORT_PHOTO_EDGE) {
    image = await ImageManipulator.manipulate(image)
      .resize(image.width >= image.height ? { width: REPORT_PHOTO_EDGE } : { height: REPORT_PHOTO_EDGE })
      .renderAsync();
  }
  const saved = await image.saveAsync({ compress: REPORT_JPEG_QUALITY, format: SaveFormat.JPEG });
  const temp = new File(saved.uri);
  try {
    return { data: await temp.bytes(), width: saved.width, height: saved.height };
  } finally {
    temp.delete();
  }
}

export type GeneratedReport = { file: File; model: ReportModel };

/** Builds the .docx for a date range into the app cache. A fresh Document is built every time. */
export async function generateReport(
  db: Db,
  name: string,
  start: DateKey,
  end: DateKey,
  onProgress?: BuildProgress,
): Promise<GeneratedReport> {
  const days = await getDaysInRange(db, start, end);
  const model = buildReportModel(name, days);
  const doc = await buildReportDocument(model, loadReportPhoto, onProgress);
  const bytes = new Uint8Array(await Packer.toArrayBuffer(doc));
  const file = new File(reportsDir(), model.fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return { file, model };
}

/** Opens the report in Word, Google Docs, … Throws NoDocxViewerError if none is installed. */
export async function openReport(file: File): Promise<void> {
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: file.contentUri,
      type: DOCX_MIME,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
  } catch (e) {
    if (/ActivityNotFound|No Activity found/i.test(String((e as Error)?.message ?? e))) throw new NoDocxViewerError();
    throw e;
  }
}

export async function shareReport(file: File): Promise<void> {
  await Sharing.shareAsync(file.uri, { mimeType: DOCX_MIME, dialogTitle: 'Share food diary report' });
}

/** Copies the report into a SAF folder, replacing an earlier copy with the same name. */
export async function saveReportToFolder(file: File, folderUri: string): Promise<void> {
  const dir = new Directory(folderUri);
  const existing = dir.list().find((e): e is File => e instanceof File && e.name === file.name);
  existing?.delete();
  await file.copy(dir);
}
