import {
  DEFAULT_SETTINGS,
  getAllPhotoFileNames,
  getDay,
  getRecentMeals,
  getDaySummaries,
  getDaysInRange,
  getSchemaVersion,
  getSettings,
  initDb,
  migrate,
  saveDayText,
  saveMeal,
  SCHEMA_VERSION,
  updateSettings,
  ValidationError,
  type Db,
} from '@/lib/db';
import { MEAL_TYPES } from '@/lib/meals';

import { createTestDb } from './helpers/nodeDb';

const TODAY = '2026-10-04';
const opts = { today: TODAY };

let db: ReturnType<typeof createTestDb>;

beforeEach(async () => {
  db = createTestDb();
  await initDb(db);
});

afterEach(() => db.close());

const meal = (description: string, photoFileNames: string[] = [], skipped = false, skipReason = '') => ({
  description,
  photoFileNames,
  skipped,
  skipReason,
});

describe('migrations', () => {
  it('creates the schema at the latest version', async () => {
    expect(await getSchemaVersion(db)).toBe(SCHEMA_VERSION);
    const tables = await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    expect(tables.map((t) => t.name)).toEqual(['day_log', 'meal_entry', 'photo', 'settings']);
  });

  it('is idempotent', async () => {
    await migrate(db);
    await migrate(db);
    expect(await getSchemaVersion(db)).toBe(SCHEMA_VERSION);
  });

  it('refuses a database from a newer app version', async () => {
    await db.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    await expect(migrate(db)).rejects.toThrow(/newer than this app/);
  });

  it('enforces foreign keys and checks at the SQL level', async () => {
    await expect(
      db.run("INSERT INTO meal_entry (id, date, meal_type, status, updated_at) VALUES ('x', '2026-10-01', 'lunch', 'logged', 'now')"),
    ).rejects.toThrow(/FOREIGN KEY/);
    await expect(db.run("INSERT INTO day_log (date, updated_at) VALUES ('04.10.2026', 'now')")).rejects.toThrow(/CHECK/);
  });
});

describe('meals', () => {
  it('returns all 7 meals in daily order for an empty day', async () => {
    const day = await getDay(db, TODAY);
    expect(day.meals.map((m) => m.type)).toEqual(MEAL_TYPES.map((m) => m.key));
    expect(day.meals.every((m) => m.status === 'empty')).toBe(true);
    expect(day.water).toBe('');
  });

  it('logs a meal with description and ordered photos', async () => {
    const { meal: saved } = await saveMeal(db, TODAY, 'lunch', meal('  Dal and rice  ', ['b.jpg', 'a.jpg']), opts);
    expect(saved.status).toBe('logged');
    expect(saved.description).toBe('Dal and rice');
    const lunch = (await getDay(db, TODAY)).meals.find((m) => m.type === 'lunch')!;
    expect(lunch.photos.map((p) => p.fileName)).toEqual(['b.jpg', 'a.jpg']);
  });

  it('counts a photo-only meal as logged', async () => {
    const { meal: saved } = await saveMeal(db, TODAY, 'snacks', meal('', ['p.jpg']), opts);
    expect(saved.status).toBe('logged');
  });

  it('keeps photo ids when reordering and reports removed files', async () => {
    const first = await saveMeal(db, TODAY, 'dinner', meal('Soup', ['a.jpg', 'b.jpg', 'c.jpg']), opts);
    const idOfB = first.meal.photos.find((p) => p.fileName === 'b.jpg')!.id;
    const second = await saveMeal(db, TODAY, 'dinner', meal('Soup', ['b.jpg', 'd.jpg']), opts);
    expect(second.removedFileNames.sort()).toEqual(['a.jpg', 'c.jpg']);
    expect(second.meal.photos.map((p) => [p.fileName, p.sortOrder])).toEqual([
      ['b.jpg', 0],
      ['d.jpg', 1],
    ]);
    expect(second.meal.photos[0].id).toBe(idOfB);
    expect(await getAllPhotoFileNames(db)).toEqual(['b.jpg', 'd.jpg']);
  });

  it('skipping clears description and photos but keeps the reason', async () => {
    await saveMeal(db, TODAY, 'breakfast', meal('Oats', ['x.jpg']), opts);
    const { meal: saved, removedFileNames } = await saveMeal(db, TODAY, 'breakfast', meal('Oats', ['x.jpg'], true, ' Not hungry '), opts);
    expect(saved).toMatchObject({ status: 'skipped', description: '', skipReason: 'Not hungry', photos: [] });
    expect(removedFileNames).toEqual(['x.jpg']);
  });

  it('removes the entry when a meal is cleared, cascading its photos', async () => {
    await saveMeal(db, TODAY, 'bed_time', meal('Milk', ['m.jpg']), opts);
    const { removedFileNames } = await saveMeal(db, TODAY, 'bed_time', meal('   '), opts);
    expect(removedFileNames).toEqual(['m.jpg']);
    expect(await db.all('SELECT * FROM meal_entry')).toHaveLength(0);
    expect(await db.all('SELECT * FROM photo')).toHaveLength(0);
  });

  it('is one entry per meal type per day', async () => {
    await saveMeal(db, TODAY, 'lunch', meal('A'), opts);
    await saveMeal(db, TODAY, 'lunch', meal('B'), opts);
    const rows = await db.all<{ description: string }>("SELECT description FROM meal_entry WHERE meal_type = 'lunch'");
    expect(rows).toEqual([{ description: 'B' }]);
  });

  it.each([
    ['a future date', '2026-10-05', 'lunch', meal('x'), /Future/],
    ['an invalid date', '2026-02-30', 'lunch', meal('x'), /Invalid date/],
    ['an unknown meal type', TODAY, 'brunch', meal('x'), /Unknown meal type/],
    ['more than 5 photos', TODAY, 'lunch', meal('', ['1', '2', '3', '4', '5', '6']), /at most 5/],
    ['duplicate photos', TODAY, 'lunch', meal('', ['1', '1']), /Duplicate/],
    ['a too long description', TODAY, 'lunch', meal('x'.repeat(501)), /longer than 500/],
  ])('rejects %s', async (_label, date, type, input, message) => {
    await expect(saveMeal(db, date, type, input, opts)).rejects.toThrow(ValidationError);
    await expect(saveMeal(db, date, type, input, opts)).rejects.toThrow(message);
    expect(await db.all('SELECT * FROM meal_entry')).toHaveLength(0);
  });

  it('rolls back the whole save if a write fails', async () => {
    const failing: Db = {
      ...db,
      transaction: (fn) =>
        db.transaction((tx) =>
          fn({
            ...tx,
            run: async (sql, ...p) => {
              if (sql.startsWith('INSERT INTO photo')) throw new Error('disk full');
              return tx.run(sql, ...p);
            },
          }),
        ),
    };
    await expect(saveMeal(failing, TODAY, 'lunch', meal('Dal', ['a.jpg']), opts)).rejects.toThrow('disk full');
    expect(await db.all('SELECT * FROM meal_entry')).toHaveLength(0);
    expect(await db.all('SELECT * FROM day_log')).toHaveLength(0);
  });
});

describe('changing the meal type', () => {
  it('moves the entry and keeps its photos', async () => {
    await saveMeal(db, TODAY, 'snacks', meal('Apple', ['a.jpg']), opts);
    const { meal: moved, removedFileNames } = await saveMeal(db, TODAY, 'mid_morning', meal('Apple', ['a.jpg']), { ...opts, fromType: 'snacks' });
    expect(moved).toMatchObject({ type: 'mid_morning', status: 'logged', description: 'Apple' });
    expect(removedFileNames).toEqual([]);
    const day = await getDay(db, TODAY);
    expect(day.meals.find((m) => m.type === 'snacks')?.status).toBe('empty');
    expect(day.meals.find((m) => m.type === 'mid_morning')?.photos.map((p) => p.fileName)).toEqual(['a.jpg']);
    expect(await getAllPhotoFileNames(db)).toEqual(['a.jpg']);
  });

  it('replaces an occupied target slot and reports its photos as removed', async () => {
    await saveMeal(db, TODAY, 'lunch', meal('Old lunch', ['old.jpg']), opts);
    await saveMeal(db, TODAY, 'dinner', meal('Soup', ['soup.jpg', 'bread.jpg']), opts);
    const { removedFileNames } = await saveMeal(db, TODAY, 'lunch', meal('Soup', ['soup.jpg']), { ...opts, fromType: 'dinner' });
    expect(removedFileNames.sort()).toEqual(['bread.jpg', 'old.jpg']);
    const day = await getDay(db, TODAY);
    expect(day.meals.find((m) => m.type === 'lunch')).toMatchObject({ description: 'Soup' });
    expect(day.meals.find((m) => m.type === 'dinner')?.status).toBe('empty');
  });

  it('rejects an unknown source type', async () => {
    await expect(saveMeal(db, TODAY, 'lunch', meal('x'), { ...opts, fromType: 'brunch' })).rejects.toThrow(/Unknown meal type/);
  });
});

describe('recent meals', () => {
  it('lists logged and skipped meals newest first, optionally only with photos', async () => {
    await saveMeal(db, '2026-10-02', 'lunch', meal('Dal', ['dal.jpg']), opts);
    await new Promise((r) => setTimeout(r, 5));
    await saveMeal(db, '2026-10-03', 'breakfast', meal('', [], true), opts);
    await new Promise((r) => setTimeout(r, 5));
    await saveMeal(db, TODAY, 'dinner', meal('Soup'), opts);

    const recent = await getRecentMeals(db, 10);
    expect(recent.map((m) => [m.date, m.type, m.status])).toEqual([
      [TODAY, 'dinner', 'logged'],
      ['2026-10-03', 'breakfast', 'skipped'],
      ['2026-10-02', 'lunch', 'logged'],
    ]);
    const withPhotos = await getRecentMeals(db, 10, { withPhotosOnly: true });
    expect(withPhotos.map((m) => m.photos[0]?.fileName)).toEqual(['dal.jpg']);
    expect(await getRecentMeals(db, 1)).toHaveLength(1);
  });

  it('returns an empty list for a new diary', async () => {
    expect(await getRecentMeals(db, 5)).toEqual([]);
  });
});

describe('water and exercise', () => {
  it('stores trimmed text per day', async () => {
    await saveDayText(db, TODAY, 'water', ' 2 litres ', opts);
    await saveDayText(db, TODAY, 'exercise', '30 min walk', opts);
    await saveDayText(db, TODAY, 'water', '2.5 litres', opts);
    expect(await getDay(db, TODAY)).toMatchObject({ water: '2.5 litres', exercise: '30 min walk' });
  });

  it('rejects future days', async () => {
    await expect(saveDayText(db, '2026-10-05', 'water', '1 l', opts)).rejects.toThrow(/Future/);
  });
});

describe('ranges and summaries', () => {
  beforeEach(async () => {
    for (const m of MEAL_TYPES) await saveMeal(db, '2026-10-01', m.key, meal('food'), opts);
    await saveDayText(db, '2026-10-01', 'water', '2 l', opts);
    await saveDayText(db, '2026-10-01', 'exercise', 'yoga', opts);
    await saveMeal(db, '2026-10-03', 'lunch', meal('', [], true), opts);
  });

  it('returns every day in a range, including empty ones', async () => {
    const days = await getDaysInRange(db, '2026-09-30', '2026-10-04');
    expect(days.map((d) => d.date)).toEqual(['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(days[1].meals.every((m) => m.status === 'logged')).toBe(true);
    expect(days[3].meals.find((m) => m.type === 'lunch')?.status).toBe('skipped');
  });

  it('summarises only days with data', async () => {
    const summaries = await getDaySummaries(db, '2026-09-01', '2026-10-31');
    expect([...summaries.keys()].sort()).toEqual(['2026-10-01', '2026-10-03']);
    expect(summaries.get('2026-10-01')).toMatchObject({ missing: 0, done: 9 });
    expect(summaries.get('2026-10-03')).toMatchObject({ skipped: 1, missing: 8 });
  });

  it('rejects inverted ranges', async () => {
    await expect(getDaysInRange(db, '2026-10-04', '2026-10-01')).rejects.toThrow(ValidationError);
  });
});

describe('settings', () => {
  it('starts with defaults', async () => {
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips typed values', async () => {
    const s = await updateSettings(db, { name: 'Anna', waterReminder: false, backupDirUri: 'content://x', endOfDayTime: '21:30' });
    expect(s).toMatchObject({ name: 'Anna', waterReminder: false, backupDirUri: 'content://x', endOfDayTime: '21:30' });
    expect(await getSettings(db)).toEqual(s);
    expect((await updateSettings(db, { backupDirUri: null })).backupDirUri).toBeNull();
  });

  it('ignores unknown keys and falls back on malformed values', async () => {
    await db.run("INSERT INTO settings (key, value) VALUES ('waterReminder', '\"yes\"'), ('name', '{bad json'), ('legacy', '1')");
    const s = await getSettings(db);
    expect(s.waterReminder).toBe(DEFAULT_SETTINGS.waterReminder);
    expect(s.name).toBe(DEFAULT_SETTINGS.name);
    expect(s).not.toHaveProperty('legacy');
  });
});
