import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * File-system-backed JSON cache for blobs that would blow past AsyncStorage's
 * default ~6MB SQLite limit on Android. Used for AniList category caches
 * (12 categories x up to 7,500 items each = potentially 80MB+ of JSON).
 *
 * Files live in `${FileSystem.documentDirectory}cache/` named `<key>.json`.
 * The directory is created lazily on first write.
 *
 * Small key/value (settings, sources, favorites, background config) stays
 * on AsyncStorage; only callers wanting to store >100KB should reach for
 * this module.
 */

const CACHE_DIR = `${FileSystem.documentDirectory}cache/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function uriFor(key: string): string {
  // Replace any path-unsafe chars in the key with `_`. AsyncStorage allowed
  // anything; the file system is stricter.
  const safe = key.replace(/[^a-z0-9._-]/gi, '_');
  return `${CACHE_DIR}${safe}.json`;
}

export async function readCacheJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const uri = uriFor(key);
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return fallback;
    const raw = await FileSystem.readAsStringAsync(uri);
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeCacheJson<T>(key: string, value: T): Promise<void> {
  await ensureDir();
  const uri = uriFor(key);
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(value));
}

export async function removeCache(key: string): Promise<void> {
  try {
    const uri = uriFor(key);
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}

/**
 * Migrate any AsyncStorage entries with the given key prefix to the file-system
 * cache, then drop them from AsyncStorage. Called once at app start to
 * recover users whose AsyncStorage hit SQLITE_FULL on prior versions.
 *
 * Returns counts for diagnostic logging.
 */
export async function migrateAsyncStorageKeys(prefix: string): Promise<{
  migrated: number;
  removed: number;
  failed: number;
}> {
  let migrated = 0;
  let removed = 0;
  let failed = 0;

  let allKeys: readonly string[] = [];
  try {
    allKeys = await AsyncStorage.getAllKeys();
  } catch {
    return { migrated, removed, failed: 1 };
  }

  const matching = allKeys.filter((k) => k.startsWith(prefix));
  for (const key of matching) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw != null) {
        await ensureDir();
        const uri = uriFor(key);
        await FileSystem.writeAsStringAsync(uri, raw);
        migrated += 1;
      }
      await AsyncStorage.removeItem(key);
      removed += 1;
    } catch {
      failed += 1;
    }
  }

  return { migrated, removed, failed };
}
