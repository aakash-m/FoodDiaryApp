import { DatabaseSync } from 'node:sqlite';

import type { Db, SqlValue } from '@/lib/db/types';

/** In-memory SQLite (Node's built-in engine) behind the app's Db interface, for unit tests. */
export function createTestDb(): Db & { close(): void } {
  const raw = new DatabaseSync(':memory:');
  let inTransaction = false;

  const db: Db & { close(): void } = {
    exec: async (sql) => {
      raw.exec(sql);
    },
    run: async (sql, ...params: SqlValue[]) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes) };
    },
    all: async <T,>(sql: string, ...params: SqlValue[]) => raw.prepare(sql).all(...params) as T[],
    first: async <T,>(sql: string, ...params: SqlValue[]) => (raw.prepare(sql).get(...params) as T | undefined) ?? null,
    transaction: async (fn) => {
      if (inTransaction) throw new Error('nested transactions are not supported');
      inTransaction = true;
      raw.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(db);
        raw.exec('COMMIT');
        return result;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      } finally {
        inTransaction = false;
      }
    },
    close: () => raw.close(),
  };
  return db;
}
