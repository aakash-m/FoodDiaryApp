import { useSyncExternalStore } from 'react';

// A counter bumped after every diary write, so screens showing diary data reload.

let version = 0;
const listeners = new Set<() => void>();

export function notifyDiaryChanged(): void {
  version++;
  listeners.forEach((l) => l());
}

export function useDiaryVersion(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
}
