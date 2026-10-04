import { useCallback, useEffect, useState } from 'react';

import { useDb } from '@/lib/db/DbProvider';
import type { Db } from '@/lib/db/types';
import { useDiaryVersion } from '@/state/diaryEvents';

export type DiaryQuery<T> = { data: T | undefined; error: Error | null; loading: boolean; reload: () => void };

type Result<T> = { key: string; data: T | undefined; error: Error | null };

/**
 * Runs `load` against the diary database and re-runs it when `deps` change or the diary is written.
 * `deps` must be primitives (strings, numbers, booleans). Previous data stays visible while reloading;
 * results of superseded runs are ignored.
 */
export function useDiaryQuery<T>(load: (db: Db) => Promise<T>, deps: readonly (string | number | boolean)[]): DiaryQuery<T> {
  const db = useDb();
  const version = useDiaryVersion();
  const [nonce, setNonce] = useState(0);
  const key = [version, nonce, ...deps].join('|');
  const [result, setResult] = useState<Result<T>>({ key: '', data: undefined, error: null });

  useEffect(() => {
    let superseded = false;
    load(db).then(
      (data) => !superseded && setResult({ key, data, error: null }),
      (e: unknown) =>
        !superseded && setResult((r) => ({ key, data: r.data, error: e instanceof Error ? e : new Error(String(e)) })),
    );
    return () => {
      superseded = true;
    };
    // `load` is recreated every render; `key` captures everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data: result.data, error: result.error, loading: result.key !== key, reload };
}
