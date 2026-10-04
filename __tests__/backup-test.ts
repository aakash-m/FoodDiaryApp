import { exportDiary, importDiary } from '@/lib/backup/diaryData';
import { BackupFormatError, backupFileName, isBackupFileName, parseBackup } from '@/lib/backup/format';
import { getDaysInRange, getAllPhotoFileNames, initDb, saveDayText, saveMeal, SCHEMA_VERSION } from '@/lib/db';

import { createTestDb } from './helpers/nodeDb';

const TODAY = '2026-10-04';
const opts = { today: TODAY };

async function sampleDiary() {
  const db = createTestDb();
  await initDb(db);
  await saveMeal(db, '2026-10-01', 'breakfast', { description: 'Oats', skipped: false, photoFileNames: ['a.jpg', 'b.jpg'] }, opts);
  await saveMeal(db, '2026-10-01', 'lunch', { description: '', skipped: true, skipReason: 'Busy', photoFileNames: [] }, opts);
  await saveDayText(db, '2026-10-01', 'water', '2 litres', opts);
  await saveMeal(db, TODAY, 'dinner', { description: 'Soup "special" & bread', skipped: false, photoFileNames: ['c.jpg'] }, opts);
  return db;
}

describe('backup file names', () => {
  it('uses local date and time', () => {
    expect(backupFileName(new Date(2026, 9, 4, 9, 5))).toBe('fooddiary-backup-20261004-0905.zip');
    expect(isBackupFileName('fooddiary-backup-20261004-0905.zip')).toBe(true);
    expect(isBackupFileName('FoodDiary_Anna_2026-09-28_2026-10-04.docx')).toBe(false);
  });
});

describe('export / import round trip', () => {
  it('restores an identical diary into an empty database', async () => {
    const source = await sampleDiary();
    const data = await exportDiary(source, { name: 'Anna', appVersion: '1.0.0', now: new Date('2026-10-04T10:00:00Z') });
    expect(data).toMatchObject({ format: 'fooddiary-backup', formatVersion: 1, schemaVersion: SCHEMA_VERSION, profile: { name: 'Anna' } });
    expect([data.days.length, data.meals.length, data.photos.length]).toEqual([2, 3, 3]);

    const parsed = parseBackup(JSON.parse(JSON.stringify(data)), SCHEMA_VERSION);
    const target = createTestDb();
    await initDb(target);
    expect(await importDiary(target, parsed)).toEqual({ days: 2, meals: 3, photos: 3 });

    const range = (db: typeof source) => getDaysInRange(db, '2026-09-30', TODAY);
    expect(await range(target)).toEqual(await range(source));
    expect(await getAllPhotoFileNames(target)).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('replaces existing data rather than merging', async () => {
    const target = await sampleDiary();
    const empty = createTestDb();
    await initDb(empty);
    await importDiary(target, await exportDiary(empty, { name: '', appVersion: '1' }));
    expect(await getAllPhotoFileNames(target)).toEqual([]);
    expect(await target.all('SELECT * FROM day_log')).toHaveLength(0);
  });

  it('leaves the current diary untouched if the backup has an invalid row', async () => {
    const target = await sampleDiary();
    const data = await exportDiary(target, { name: 'A', appVersion: '1' });
    data.meals[0].meal_type = 'brunch'; // violates the CHECK constraint
    await expect(importDiary(target, data)).rejects.toThrow();
    expect(await getAllPhotoFileNames(target)).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('rejects rows without a parent', async () => {
    const target = createTestDb({ foreignKeysInTransactions: false });
    await initDb(target);
    const data = await exportDiary(await sampleDiary(), { name: 'A', appVersion: '1' });
    data.days = data.days.filter((d) => d.date !== TODAY);
    await expect(importDiary(target, data)).rejects.toThrow(/damaged/);
    expect(await target.all('SELECT * FROM meal_entry')).toHaveLength(0);
  });
});

describe('parseBackup', () => {
  const valid = async () => JSON.parse(JSON.stringify(await exportDiary(await sampleDiary(), { name: 'A', appVersion: '1' })));

  it('rejects files that are not Food Diary backups', () => {
    expect(() => parseBackup({ hello: 'world' }, SCHEMA_VERSION)).toThrow(BackupFormatError);
    expect(() => parseBackup([], SCHEMA_VERSION)).toThrow(/not a Food Diary backup/);
  });

  it('rejects backups from newer app versions', async () => {
    const data = await valid();
    expect(() => parseBackup({ ...data, formatVersion: 2 }, SCHEMA_VERSION)).toThrow(/newer version/);
    expect(() => parseBackup({ ...data, schemaVersion: SCHEMA_VERSION + 1 }, SCHEMA_VERSION)).toThrow(/newer version/);
  });

  it('rejects damaged rows and unsafe photo names', async () => {
    const broken = await valid();
    broken.meals[0].description = 42;
    expect(() => parseBackup(broken, SCHEMA_VERSION)).toThrow(/damaged/);
    const traversal = await valid();
    traversal.photos[0].file_name = '../../databases/x.jpg';
    expect(() => parseBackup(traversal, SCHEMA_VERSION)).toThrow(/damaged/);
  });
});
