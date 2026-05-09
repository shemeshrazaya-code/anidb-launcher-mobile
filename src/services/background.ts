import { useCallback, useEffect, useState } from 'react';

import { readJson, writeJson } from './storage';

export type BackgroundVariant = 'aurora' | 'snake-skin' | 'solid' | 'gradient' | 'custom';

export interface BackgroundConfig {
  variant: BackgroundVariant;
  customUri?: string | null;
}

export interface BackgroundPreset {
  variant: BackgroundVariant;
  name: string;
  description: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { variant: 'aurora', name: 'Midnight aurora', description: 'Calm teal and violet depth' },
  { variant: 'solid', name: 'Solid dark', description: 'Plain near-black, distraction-free' },
  { variant: 'gradient', name: 'Violet fade', description: 'Top-down gradient, dark violet to near-black' },
  { variant: 'snake-skin', name: 'Snake skin', description: 'Subtle violet-tinted scale pattern' },
];

const STORAGE_KEY = 'app-background-v1';
const DEFAULT_CONFIG: BackgroundConfig = { variant: 'aurora' };

export async function loadBackground(): Promise<BackgroundConfig> {
  const stored = await readJson<BackgroundConfig | null>(STORAGE_KEY, null);
  return stored ?? DEFAULT_CONFIG;
}

export async function saveBackground(config: BackgroundConfig): Promise<void> {
  await writeJson(STORAGE_KEY, config);
}

const subscribers = new Set<(c: BackgroundConfig) => void>();

export function subscribeBackground(cb: (c: BackgroundConfig) => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function notify(config: BackgroundConfig): void {
  for (const cb of subscribers) cb(config);
}

export function useAppBackground(): {
  config: BackgroundConfig;
  setVariant: (v: BackgroundVariant) => Promise<void>;
  setCustomUri: (uri: string) => Promise<void>;
  clearCustom: () => Promise<void>;
} {
  const [config, setConfig] = useState<BackgroundConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    let cancelled = false;
    loadBackground().then((c) => {
      if (!cancelled) setConfig(c);
    });
    const unsub = subscribeBackground((c) => {
      if (!cancelled) setConfig(c);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const setVariant = useCallback(
    async (variant: BackgroundVariant) => {
      const next: BackgroundConfig = { ...config, variant };
      await saveBackground(next);
      setConfig(next);
      notify(next);
    },
    [config],
  );

  const setCustomUri = useCallback(
    async (uri: string) => {
      const next: BackgroundConfig = { variant: 'custom', customUri: uri };
      await saveBackground(next);
      setConfig(next);
      notify(next);
    },
    [],
  );

  const clearCustom = useCallback(async () => {
    const next: BackgroundConfig = { variant: 'aurora', customUri: null };
    await saveBackground(next);
    setConfig(next);
    notify(next);
  }, []);

  return { config, setVariant, setCustomUri, clearCustom };
}
