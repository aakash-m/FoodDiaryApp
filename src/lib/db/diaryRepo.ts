import { deriveMealStatus, summarizeDay, type DaySummary, type MealStatus } from '@/lib/completeness';
import { addDays, diffDays, isDateKey, todayKey, type DateKey } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { MEAL_TYPES, isMealTypeKey, type MealTypeKey } from '@/lib/meals';

import type { Db } from './types';

export const MAX_PHOTOS_PER_MEAL = 5;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_SKIP_REASON_LENGTH = 80;
export const MAX_DAY_TEXT_LENGTH = 200;

export class ValidationError extends Error {
  override name = 'ValidationError';
}

export type PhotoRecord = { id: string; fileName: string; sortOrder: number };

export type MealRecord = {
  type: MealTypeKey;
  status: MealStatus;
  description: string;
  skipReason: string;
  photos: PhotoRecord[];
  updatedAt: string | null;
};

export type DayRecord = {
  date: DateKey;
  water: string;
  exercise: string;
  /** Always all 7 meal types, in daily order; types without an entry are 'empty'. */
  meals: MealRecord[];
};

type DayRow = { date: string; water_text: string; exercise_text: string };
type MealRow = {
  id: string;
  date: string;
  meal_type: MealTypeKey;
  status: MealStatus;
  description: string;
  skip_reason: string;
  updated_at: string;
};
type PhotoRow = { id: string; meal_entry_id: string; file_name: string; sort_order: number };

function assertLoggableDate(date: string, today: DateKey) {
  if (!isDateKey(date)) throw new ValidationError(`Invalid date "${date}"`);
  if (date > today) throw new ValidationError('Future days cannot be logged');
}

function assertMaxLength(value: string, max: number, field: string) {
  if (value.length > max) throw new ValidationError(`${field} is longer than ${max} characters`);
}

function emptyMeal(type: MealTypeKey): MealRecord {
  return { type, status: 'empty', description: '', skipReason: '', photos: [], updatedAt: null };
}

function assembleDays(dates: DateKey[], dayRows: DayRow[], mealRows: MealRow[], photoRows: PhotoRow[]): DayRecord[] {
  const photosByMeal = new Map<string, PhotoRecord[]>();
  for (const p of photoRows) {
    const list = photosByMeal.get(p.meal_entry_id) ?? [];
    list.push({ id: p.id, fileName: p.file_name, sortOrder: p.sort_order });
    photosByMeal.set(p.meal_entry_id, list);
  }
  const daysByDate = new Map(dayRows.map((d) => [d.date, d]));
  const mealsByDate = new Map<string, Map<MealTypeKey, MealRow>>();
  for (const m of mealRows) {
    const byType = mealsByDate.get(m.date) ?? new Map<MealTypeKey, MealRow>();
    byType.set(m.meal_type, m);
    mealsByDate.set(m.date, byType);
  }
  return dates.map((date) => {
    const day = daysByDate.get(date);
    const meals = mealsByDate.get(date);
    return {
      date,
      water: day?.water_text ?? '',
      exercise: day?.exercise_text ?? '',
      meals: MEAL_TYPES.map(({ key }) => {
        const row = meals?.get(key);
        if (!row) return emptyMeal(key);
        return {
          type: key,
          status: row.status,
          description: row.description,
          skipReason: row.skip_reason,
          photos: (photosByMeal.get(row.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
          updatedAt: row.updated_at,
        };
      }),
    };
  });
}

/** Every date from start to end inclusive, including days with nothing logged (report input). */
export async function getDaysInRange(db: Db, start: DateKey, end: DateKey): Promise<DayRecord[]> {
  if (!isDateKey(start) || !isDateKey(end) || end < start) throw new ValidationError(`Invalid range ${start}–${end}`);
  const dates = Array.from({ length: diffDays(start, end) + 1 }, (_, i) => addDays(start, i));
  const [dayRows, mealRows, photoRows] = await Promise.all([
    db.all<DayRow>('SELECT date, water_text, exercise_text FROM day_log WHERE date BETWEEN ? AND ?', start, end),
    db.all<MealRow>(
      'SELECT id, date, meal_type, status, description, skip_reason, updated_at FROM meal_entry WHERE date BETWEEN ? AND ?',
      start,
      end,
    ),
    db.all<PhotoRow>(
      `SELECT p.id, p.meal_entry_id, p.file_name, p.sort_order
         FROM photo p JOIN meal_entry m ON m.id = p.meal_entry_id
        WHERE m.date BETWEEN ? AND ?`,
      start,
      end,
    ),
  ]);
  return assembleDays(dates, dayRows, mealRows, photoRows);
}

export async function getDay(db: Db, date: DateKey): Promise<DayRecord> {
  const [day] = await getDaysInRange(db, date, date);
  return day;
}

/** Completeness per date for dates that have any data (calendar dots, progress). */
export async function getDaySummaries(db: Db, start: DateKey, end: DateKey): Promise<Map<DateKey, DaySummary>> {
  const [dayRows, mealRows] = await Promise.all([
    db.all<DayRow>('SELECT date, water_text, exercise_text FROM day_log WHERE date BETWEEN ? AND ?', start, end),
    db.all<Pick<MealRow, 'date' | 'meal_type' | 'status'>>(
      'SELECT date, meal_type, status FROM meal_entry WHERE date BETWEEN ? AND ?',
      start,
      end,
    ),
  ]);
  const result = new Map<DateKey, DaySummary>();
  for (const d of dayRows) {
    const meals = mealRows.filter((m) => m.date === d.date).map((m) => ({ type: m.meal_type, status: m.status }));
    result.set(d.date, summarizeDay({ meals, water: d.water_text, exercise: d.exercise_text }));
  }
  return result;
}

export type SaveMealInput = {
  description: string;
  skipped: boolean;
  skipReason?: string;
  /** Photo file names (in the app's photo directory) in display order. */
  photoFileNames: string[];
};

export type SaveMealResult = {
  meal: MealRecord;
  /** Photo files no longer referenced by this meal; the caller deletes them from disk. */
  removedFileNames: string[];
};

async function touchDay(tx: Db, date: DateKey, now: string) {
  await tx.run(
    `INSERT INTO day_log (date, updated_at) VALUES (?, ?)
     ON CONFLICT (date) DO UPDATE SET updated_at = excluded.updated_at`,
    date,
    now,
  );
}

type NormalizedMeal = { status: MealStatus; description: string; skipReason: string; fileNames: string[] };

function normalizeMeal(input: SaveMealInput): NormalizedMeal {
  const description = input.skipped ? '' : input.description.trim();
  const skipReason = input.skipped ? (input.skipReason ?? '').trim() : '';
  const fileNames = input.skipped ? [] : input.photoFileNames;
  assertMaxLength(description, MAX_DESCRIPTION_LENGTH, 'Description');
  assertMaxLength(skipReason, MAX_SKIP_REASON_LENGTH, 'Skip reason');
  if (fileNames.length > MAX_PHOTOS_PER_MEAL) throw new ValidationError(`A meal can have at most ${MAX_PHOTOS_PER_MEAL} photos`);
  if (new Set(fileNames).size !== fileNames.length) throw new ValidationError('Duplicate photo in meal');
  const status = deriveMealStatus({ skipped: input.skipped, description, photoCount: fileNames.length });
  return { status, description, skipReason, fileNames };
}

const EMPTY: NormalizedMeal = { status: 'empty', description: '', skipReason: '', fileNames: [] };

/** Writes one meal slot inside a transaction; returns the record and photo files it no longer references. */
async function writeMeal(tx: Db, date: DateKey, type: MealTypeKey, meal: NormalizedMeal, now: string): Promise<SaveMealResult> {
  const existing = await tx.first<{ id: string }>('SELECT id FROM meal_entry WHERE date = ? AND meal_type = ?', date, type);
  const oldPhotos = existing
    ? await tx.all<PhotoRow>('SELECT id, meal_entry_id, file_name, sort_order FROM photo WHERE meal_entry_id = ?', existing.id)
    : [];
  const removedFileNames = oldPhotos.map((p) => p.file_name).filter((f) => !meal.fileNames.includes(f));
  await touchDay(tx, date, now);

  if (meal.status === 'empty') {
    // Delete photos explicitly: the cascade only works on connections with foreign keys enabled.
    if (existing) {
      await tx.run('DELETE FROM photo WHERE meal_entry_id = ?', existing.id);
      await tx.run('DELETE FROM meal_entry WHERE id = ?', existing.id);
    }
    return { meal: emptyMeal(type), removedFileNames };
  }

  const id = existing?.id ?? newId();
  await tx.run(
    `INSERT INTO meal_entry (id, date, meal_type, status, description, skip_reason, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (date, meal_type) DO UPDATE SET
       status = excluded.status, description = excluded.description,
       skip_reason = excluded.skip_reason, updated_at = excluded.updated_at`,
    id,
    date,
    type,
    meal.status,
    meal.description,
    meal.skipReason,
    now,
  );

  // Rewrite photo rows in the new order, keeping the ids of photos that stay.
  const kept = new Map(oldPhotos.map((p) => [p.file_name, p]));
  await tx.run('DELETE FROM photo WHERE meal_entry_id = ?', id);
  const photos: PhotoRecord[] = [];
  for (const [sortOrder, fileName] of meal.fileNames.entries()) {
    const photoId = kept.get(fileName)?.id ?? newId();
    await tx.run(
      'INSERT INTO photo (id, meal_entry_id, file_name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
      photoId,
      id,
      fileName,
      sortOrder,
      now,
    );
    photos.push({ id: photoId, fileName, sortOrder });
  }

  return {
    meal: { type, status: meal.status, description: meal.description, skipReason: meal.skipReason, photos, updatedAt: now },
    removedFileNames,
  };
}

/**
 * Creates, updates or clears a meal. Skipping clears description and photos (PLAN.md §2.3).
 * A meal with no description, no photos and not skipped is removed.
 * With `fromType` (the user changed the meal type in the editor) the entry moves: the old slot is
 * cleared and the target slot replaced, in one transaction.
 */
export async function saveMeal(
  db: Db,
  date: DateKey,
  type: string,
  input: SaveMealInput,
  opts: { today?: DateKey; fromType?: string } = {},
): Promise<SaveMealResult> {
  assertLoggableDate(date, opts.today ?? todayKey());
  if (!isMealTypeKey(type)) throw new ValidationError(`Unknown meal type "${type}"`);
  const fromType = opts.fromType ?? type;
  if (!isMealTypeKey(fromType)) throw new ValidationError(`Unknown meal type "${fromType}"`);
  const meal = normalizeMeal(input);
  const now = new Date().toISOString();

  return db.transaction(async (tx) => {
    if (fromType === type) return writeMeal(tx, date, type, meal, now);
    const cleared = await writeMeal(tx, date, fromType, EMPTY, now);
    const saved = await writeMeal(tx, date, type, meal, now);
    // Photos carried over from the old slot are still in use.
    const removed = new Set([...cleared.removedFileNames, ...saved.removedFileNames]);
    for (const f of meal.fileNames) removed.delete(f);
    return { meal: saved.meal, removedFileNames: [...removed] };
  });
}

export type RecentMeal = MealRecord & { date: DateKey };

/** Most recently updated logged or skipped meals, newest first (Home feed, recent activity). */
export async function getRecentMeals(db: Db, limit: number, opts: { withPhotosOnly?: boolean } = {}): Promise<RecentMeal[]> {
  const rows = await db.all<MealRow>(
    `SELECT m.id, m.date, m.meal_type, m.status, m.description, m.skip_reason, m.updated_at
       FROM meal_entry m
      WHERE m.status != 'empty' ${opts.withPhotosOnly ? 'AND EXISTS (SELECT 1 FROM photo p WHERE p.meal_entry_id = m.id)' : ''}
      ORDER BY m.updated_at DESC, m.date DESC
      LIMIT ?`,
    limit,
  );
  if (rows.length === 0) return [];
  const placeholders = rows.map(() => '?').join(', ');
  const photoRows = await db.all<PhotoRow>(
    `SELECT id, meal_entry_id, file_name, sort_order FROM photo WHERE meal_entry_id IN (${placeholders}) ORDER BY sort_order`,
    ...rows.map((r) => r.id),
  );
  return rows.map((r) => ({
    date: r.date,
    type: r.meal_type,
    status: r.status,
    description: r.description,
    skipReason: r.skip_reason,
    updatedAt: r.updated_at,
    photos: photoRows
      .filter((p) => p.meal_entry_id === r.id)
      .map((p) => ({ id: p.id, fileName: p.file_name, sortOrder: p.sort_order })),
  }));
}

export type DayTextField = 'water' | 'exercise';

export async function saveDayText(
  db: Db,
  date: DateKey,
  field: DayTextField,
  text: string,
  opts: { today?: DateKey } = {},
): Promise<void> {
  assertLoggableDate(date, opts.today ?? todayKey());
  const value = text.trim();
  assertMaxLength(value, MAX_DAY_TEXT_LENGTH, field === 'water' ? 'Water intake' : 'Exercise');
  const column = field === 'water' ? 'water_text' : 'exercise_text';
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO day_log (date, ${column}, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (date) DO UPDATE SET ${column} = excluded.${column}, updated_at = excluded.updated_at`,
    date,
    value,
    now,
  );
}

/** First and last date with any entry, or null for an empty diary. */
export async function getDiaryDateRange(db: Db): Promise<{ first: DateKey; last: DateKey } | null> {
  const row = await db.first<{ first: string | null; last: string | null }>('SELECT MIN(date) AS first, MAX(date) AS last FROM day_log');
  return row?.first && row.last ? { first: row.first, last: row.last } : null;
}

/** All photo file names referenced by the diary (backup and orphan clean-up). */
export async function getAllPhotoFileNames(db: Db): Promise<string[]> {
  const rows = await db.all<{ file_name: string }>('SELECT file_name FROM photo ORDER BY file_name');
  return rows.map((r) => r.file_name);
}
