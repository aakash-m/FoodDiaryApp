// Minimal database interface. The app uses expo-sqlite (expoDb.ts); unit tests use node:sqlite,
// so schema and repositories are tested against a real SQLite engine.

export type SqlValue = string | number | null;

export interface Db {
  exec(sql: string): Promise<void>;
  run(sql: string, ...params: SqlValue[]): Promise<{ changes: number }>;
  all<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, ...params: SqlValue[]): Promise<T | null>;
  /** Runs `fn` in an exclusive transaction; rolls back if it throws. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}
