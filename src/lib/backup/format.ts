// Backup archive format (PLAN.md §5): a ZIP with data.json (this structure) and photos/<file name>.

export const BACKUP_FORMAT = 'fooddiary-backup';
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_DATA_FILE = 'data.json';
export const BACKUP_PHOTO_DIR = 'photos/';
export const BACKUP_FILE_PREFIX = 'fooddiary-backup-';

export type BackupDayRow = { date: string; water_text: string; exercise_text: string; updated_at: string };
export type BackupMealRow = {
  id: string;
  date: string;
  meal_type: string;
  status: string;
  description: string;
  skip_reason: string;
  updated_at: string;
};
export type BackupPhotoRow = { id: string; meal_entry_id: string; file_name: string; sort_order: number; created_at: string };

export type BackupData = {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  /** Database schema version the rows were exported from. */
  schemaVersion: number;
  createdAt: string;
  appVersion: string;
  profile: { name: string };
  days: BackupDayRow[];
  meals: BackupMealRow[];
  photos: BackupPhotoRow[];
};

export class BackupFormatError extends Error {
  override name = 'BackupFormatError';
}

const pad = (n: number) => String(n).padStart(2, '0');

/** fooddiary-backup-20261004-1530.zip (local time). */
export function backupFileName(now: Date): string {
  return `${BACKUP_FILE_PREFIX}${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.zip`;
}

export function isBackupFileName(name: string): boolean {
  return name.startsWith(BACKUP_FILE_PREFIX) && name.endsWith('.zip');
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => typeof v === 'string';

function rows<T>(value: unknown, field: string, check: (r: Record<string, unknown>) => boolean): T[] {
  if (!Array.isArray(value)) throw new BackupFormatError(`This backup is damaged (${field} is missing).`);
  for (const r of value) if (!isObj(r) || !check(r)) throw new BackupFormatError(`This backup is damaged (invalid ${field} entry).`);
  return value as T[];
}

/** Validates parsed data.json. `maxSchemaVersion` is the app's own schema version. */
export function parseBackup(json: unknown, maxSchemaVersion: number): BackupData {
  if (!isObj(json) || json.format !== BACKUP_FORMAT) throw new BackupFormatError('This file is not a Food Diary backup.');
  if (typeof json.formatVersion !== 'number' || json.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupFormatError('This backup was made by a newer version of Food Diary. Please update the app first.');
  }
  if (typeof json.schemaVersion !== 'number' || json.schemaVersion > maxSchemaVersion) {
    throw new BackupFormatError('This backup was made by a newer version of Food Diary. Please update the app first.');
  }
  const profile = isObj(json.profile) && str(json.profile.name) ? { name: json.profile.name as string } : { name: '' };
  return {
    format: BACKUP_FORMAT,
    formatVersion: json.formatVersion,
    schemaVersion: json.schemaVersion,
    createdAt: str(json.createdAt) ? (json.createdAt as string) : '',
    appVersion: str(json.appVersion) ? (json.appVersion as string) : '',
    profile,
    days: rows<BackupDayRow>(json.days, 'days', (r) => str(r.date) && str(r.water_text) && str(r.exercise_text) && str(r.updated_at)),
    meals: rows<BackupMealRow>(
      json.meals,
      'meals',
      (r) => str(r.id) && str(r.date) && str(r.meal_type) && str(r.status) && str(r.description) && str(r.skip_reason) && str(r.updated_at),
    ),
    photos: rows<BackupPhotoRow>(
      json.photos,
      'photos',
      (r) => str(r.id) && str(r.meal_entry_id) && str(r.file_name) && typeof r.sort_order === 'number' && str(r.created_at) && !/[\\/]/.test(r.file_name as string),
    ),
  };
}
