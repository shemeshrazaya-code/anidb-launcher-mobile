import { readJson, writeJson } from './storage';

const STORAGE_KEY = 'prefs';

export type Prefs = Record<string, unknown>;

export async function loadPrefs(): Promise<Prefs> {
  const stored = await readJson<Prefs | null>(STORAGE_KEY, null);
  return stored && typeof stored === 'object' ? stored : {};
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  await writeJson<Prefs>(STORAGE_KEY, prefs);
}

export async function setPref<T>(key: string, value: T): Promise<Prefs> {
  const prefs = await loadPrefs();
  prefs[key] = value;
  await savePrefs(prefs);
  return prefs;
}
