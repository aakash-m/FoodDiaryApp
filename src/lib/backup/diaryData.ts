import { getSchemaVersion } from '@/lib/db/schema';
import type { Db } from '@/lib/db/types';

import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  type BackupData,
  type BackupDayRow,
  type BackupMealRow,
  type BackupPhotoRow,
} from './format';

/** All diary rows as they are stored (backups stay faithful and schema migrations apply on restore). */
export async function exportDiary(db: Db, meta: { name: string; appVersion: string; now?: Date }): Promise<BackupData> {
  const [schemaVersion, days, meals, photos] = await Promise.all([
    getSchemaVersion(db),
    db.all<BackupDayRow>('SELECT date, water_text, exercise_text, updated_at FROM day_log ORDER BY date'),
    db.all<BackupMealRow>('SELECT id, date, meal_type, status, description, skip_reason, updated_at FROM meal_entry ORDER BY date, meal_type'),
    db.all<BackupPhotoRow>('SELECT id, meal_entry_id, file_name, sort_order, created_at FROM photo ORDER BY meal_entry_id, sort_order'),
  ]);
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion,
    createdAt: (meta.now ?? new Date()).toISOString(),
    appVersion: meta.appVersion,
    profile: { name: meta.name },
    days,
    meals,
    photos,
  };
}

export type ImportCounts = { days: number; meals: number; photos: number };

/**
 * Replaces the whole diary with the backup's rows in one transaction. Any invalid row (the
 * database's CHECK/UNIQUE constraints) aborts the import and leaves the current diary untouched.
 */
export async function importDiary(db: Db, data: BackupData): Promise<ImportCounts> {
  return db.transaction(async (tx) => {
    await tx.run('DELETE FROM photo');
    await tx.run('DELETE FROM meal_entry');
    await tx.run('DELETE FROM day_log');
    for (const d of data.days) {
      await tx.run('INSERT INTO day_log (date, water_text, exercise_text, updated_at) VALUES (?, ?, ?, ?)', d.date, d.water_text, d.exercise_text, d.updated_at);
    }
    for (const m of data.meals) {
      await tx.run(
        'INSERT INTO meal_entry (id, date, meal_type, status, description, skip_reason, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        m.id,
        m.date,
        m.meal_type,
        m.status,
        m.description,
        m.skip_reason,
        m.updated_at,
      );
    }
    for (const p of data.photos) {
      await tx.run(
        'INSERT INTO photo (id, meal_entry_id, file_name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
        p.id,
        p.meal_entry_id,
        p.file_name,
        p.sort_order,
        p.created_at,
      );
    }
    // The writer connection enforces foreign keys, but check explicitly so a damaged backup can't leave orphans.
    const orphans = await tx.first<{ n: number }>(
      `SELECT (SELECT COUNT(*) FROM meal_entry WHERE date NOT IN (SELECT date FROM day_log))
            + (SELECT COUNT(*) FROM photo WHERE meal_entry_id NOT IN (SELECT id FROM meal_entry)) AS n`,
    );
    if (orphans && orphans.n > 0) throw new Error('This backup is damaged (entries without a day or meal).');
    return { days: data.days.length, meals: data.meals.length, photos: data.photos.length };
  });
}
