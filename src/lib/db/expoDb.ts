import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { Db, SqlValue } from './types';

export const DATABASE_NAME = 'fooddiary.db';

/** Per-connection setup. PRAGMA foreign_keys is not shared between connections. */
export const CONNECTION_PRAGMAS = 'PRAGMA foreign_keys = ON;';

function statements(db: SQLiteDatabase): Omit<Db, 'transaction'> {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, ...params: SqlValue[]) => {
      const r = await db.runAsync(sql, params);
      return { changes: r.changes };
    },
    all: (sql, ...params: SqlValue[]) => db.getAllAsync(sql, params),
    first: (sql, ...params: SqlValue[]) => db.getFirstAsync(sql, params),
  };
}

/**
 * Wraps an expo-sqlite database in the Db interface.
 *
 * Transactions run on one dedicated writer connection, opened lazily with the connection PRAGMAs,
 * and are queued so only one runs at a time. (expo-sqlite's withExclusiveTransactionAsync opens a
 * fresh connection per transaction, on which foreign keys would be off.)
 */
export function fromExpo(db: SQLiteDatabase): Db {
  let writer: Promise<SQLiteDatabase> | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  const getWriter = () =>
    (writer ??= openDatabaseAsync(DATABASE_NAME, { useNewConnection: true }).then(async (conn) => {
      await conn.execAsync(CONNECTION_PRAGMAS);
      return conn;
    }));

  return {
    ...statements(db),
    transaction: <T,>(fn: (tx: Db) => Promise<T>): Promise<T> => {
      const run = async () => {
        const conn = await getWriter();
        const tx: Db = {
          ...statements(conn),
          transaction: () => Promise.reject(new Error('nested transactions are not supported')),
        };
        await conn.execAsync('BEGIN IMMEDIATE');
        try {
          const result = await fn(tx);
          await conn.execAsync('COMMIT');
          return result;
        } catch (e) {
          await conn.execAsync('ROLLBACK');
          throw e;
        }
      };
      const next = queue.then(run, run);
      queue = next.catch(() => undefined);
      return next;
    },
  };
}
