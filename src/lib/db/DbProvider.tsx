import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useMemo, type ReactNode } from 'react';

import { DATABASE_NAME, fromExpo } from './expoDb';
import { initDb } from './schema';
import type { Db } from './types';

/** Opens the diary database and runs migrations before rendering children. */
export function DbProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={(db) => initDb(fromExpo(db))}>
      {children}
    </SQLiteProvider>
  );
}

export function useDb(): Db {
  const db = useSQLiteContext();
  return useMemo(() => fromExpo(db), [db]);
}
