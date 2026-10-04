import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { useDb } from '@/lib/db/DbProvider';
import { getSettings, updateSettings as persistSettings, type AppSettings } from '@/lib/db/settingsRepo';

type SettingsContextValue = {
  settings: AppSettings;
  /** Resolves true when saved; on failure the change is reverted and it resolves false (never rejects). */
  update: (patch: Partial<AppSettings>) => Promise<boolean>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Loads settings from SQLite once; renders children only after they are available. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useDb();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const latest = useRef<AppSettings | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    getSettings(db)
      .then((s) => {
        latest.current = s;
        setSettings(s);
      })
      .catch((e: Error) => setLoadError(e));
  }, [db]);

  // Optimistic: the UI updates at once. If the write fails, only the keys of this patch are reverted
  // (so an overlapping update is kept).
  const update = useCallback(
    async (patch: Partial<AppSettings>) => {
      const previous = latest.current;
      if (!previous) return false;
      latest.current = { ...previous, ...patch };
      setSettings(latest.current);
      try {
        await persistSettings(db, patch);
        return true;
      } catch (e) {
        const reverted = Object.fromEntries(Object.keys(patch).map((k) => [k, previous[k as keyof AppSettings]]));
        latest.current = { ...latest.current, ...reverted } as AppSettings;
        setSettings(latest.current);
        console.warn('Saving settings failed', e);
        return false;
      }
    },
    [db],
  );

  if (loadError) throw loadError;
  if (!settings) return null;
  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>;
}

function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

export function useSettings(): AppSettings {
  return useSettingsContext().settings;
}

export function useUpdateSettings(): (patch: Partial<AppSettings>) => Promise<boolean> {
  return useSettingsContext().update;
}
