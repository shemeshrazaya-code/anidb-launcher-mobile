import { useCallback, useEffect, useState } from 'react';

import { readJson, writeJson } from './storage';

export interface AppSettings {
  /** Adult ("Hentai") category visible in the picker. */
  hentaiEnabled: boolean;
}

const STORAGE_KEY = 'app-settings-v1';
const DEFAULTS: AppSettings = { hentaiEnabled: true };

export async function loadAppSettings(): Promise<AppSettings> {
  const stored = await readJson<AppSettings | null>(STORAGE_KEY, null);
  return { ...DEFAULTS, ...(stored ?? {}) };
}

export async function saveAppSettings(s: AppSettings): Promise<void> {
  await writeJson(STORAGE_KEY, s);
}

const subscribers = new Set<(s: AppSettings) => void>();

export function subscribeAppSettings(cb: (s: AppSettings) => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function notify(s: AppSettings): void {
  for (const cb of subscribers) cb(s);
}

export function useAppSettings(): {
  settings: AppSettings;
  setHentaiEnabled: (v: boolean) => Promise<void>;
} {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    loadAppSettings().then((s) => {
      if (!cancelled) setSettings(s);
    });
    const unsub = subscribeAppSettings((s) => {
      if (!cancelled) setSettings(s);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const setHentaiEnabled = useCallback(async (v: boolean) => {
    const next: AppSettings = { ...settings, hentaiEnabled: v };
    await saveAppSettings(next);
    setSettings(next);
    notify(next);
  }, [settings]);

  return { settings, setHentaiEnabled };
}
