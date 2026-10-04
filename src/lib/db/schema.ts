import { MEAL_TYPES } from '@/lib/meals';

import type { Db } from './types';

const mealTypeList = MEAL_TYPES.map((m) => `'${m.key}'`).join(', ');

/**
 * Ordered schema migrations. Index i upgrades user_version i → i + 1.
 * Never edit a shipped migration; append a new one instead.
 */
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE day_log (
    date          TEXT PRIMARY KEY CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
    water_text    TEXT NOT NULL DEFAULT '',
    exercise_text TEXT NOT NULL DEFAULT '',
    updated_at    TEXT NOT NULL
  );

  CREATE TABLE meal_entry (
    id          TEXT PRIMARY KEY,
    date        TEXT NOT NULL REFERENCES day_log (date) ON DELETE CASCADE,
    meal_type   TEXT NOT NULL CHECK (meal_type IN (${mealTypeList})),
    status      TEXT NOT NULL CHECK (status IN ('empty', 'logged', 'skipped')),
    description TEXT NOT NULL DEFAULT '',
    skip_reason TEXT NOT NULL DEFAULT '',
    updated_at  TEXT NOT NULL,
    UNIQUE (date, meal_type)
  );

  CREATE TABLE photo (
    id            TEXT PRIMARY KEY,
    meal_entry_id TEXT NOT NULL REFERENCES meal_entry (id) ON DELETE CASCADE,
    file_name     TEXT NOT NULL,
    sort_order    INTEGER NOT NULL CHECK (sort_order BETWEEN 0 AND 4),
    created_at    TEXT NOT NULL,
    UNIQUE (meal_entry_id, sort_order)
  );
  CREATE INDEX photo_by_meal ON photo (meal_entry_id);

  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function getSchemaVersion(db: Db): Promise<number> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/** Applies pending migrations, each in its own transaction together with its user_version bump. */
export async function migrate(db: Db): Promise<number> {
  const current = await getSchemaVersion(db);
  if (current > SCHEMA_VERSION) {
    throw new Error(`Database schema v${current} is newer than this app (v${SCHEMA_VERSION}). Please update the app.`);
  }
  for (let v = current; v < SCHEMA_VERSION; v++) {
    await db.transaction(async (tx) => {
      await tx.exec(MIGRATIONS[v]);
      await tx.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return SCHEMA_VERSION;
}

/**
 * Removes rows whose parent is gone. Writes are FK-safe now, but versions before 04.10.2026 could
 * leave orphaned photo rows when a meal moved to another meal type.
 */
export async function repairOrphans(db: Db): Promise<number> {
  return db.transaction(async (tx) => {
    const photos = await tx.run('DELETE FROM photo WHERE meal_entry_id NOT IN (SELECT id FROM meal_entry)');
    const meals = await tx.run('DELETE FROM meal_entry WHERE date NOT IN (SELECT date FROM day_log)');
    return photos.changes + meals.changes;
  });
}

/** Connection setup, migrations and integrity repair. PRAGMAs must run outside a transaction. */
export async function initDb(db: Db): Promise<void> {
  await db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await migrate(db);
  await repairOrphans(db);
}
