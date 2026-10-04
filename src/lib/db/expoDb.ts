import type { SQLiteDatabase } from 'expo-sqlite';

import type { Db, SqlValue } from './types';

export const DATABASE_NAME = 'fooddiary.db';

/** Wraps an expo-sqlite database (or transaction handle) in the Db interface. */
export function fromExpo(db: SQLiteDatabase): Db {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, ...params: SqlValue[]) => {
      const r = await db.runAsync(sql, params);
      return { changes: r.changes };
    },
    all: (sql, ...params: SqlValue[]) => db.getAllAsync(sql, params),
    first: (sql, ...params: SqlValue[]) => db.getFirstAsync(sql, params),
    transaction: async (fn) => {
      let result!: Awaited<ReturnType<typeof fn>>;
      await db.withExclusiveTransactionAsync(async (txn) => {
        result = await fn(fromExpo(txn));
      });
      return result;
    },
  };
}
