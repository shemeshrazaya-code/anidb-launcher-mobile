import { AnimeDetail } from '@/src/types/anime';
import { CATEGORIES, getCachedCategory } from './anilist';
import { readJson, writeJson } from './storage';

const STORAGE_KEY = 'favorites';

interface FavoritesFileV1 {
  favorites: number[];
}

/**
 * v2 stores full AnimeDetail snapshots next to the id list, so the Favorites
 * tab renders without scanning every category cache and a favorite survives
 * falling out of the category caches. `ids` stays the source of truth for
 * membership; `items` may lag behind for favorites saved before v2
 * (backfilled via recordFavoriteSnapshot when the title is next opened).
 */
interface FavoritesFileV2 {
  version: 2;
  ids: number[];
  items: AnimeDetail[];
}

function isV2(f: unknown): f is FavoritesFileV2 {
  return (
    !!f &&
    typeof f === 'object' &&
    (f as FavoritesFileV2).version === 2 &&
    Array.isArray((f as FavoritesFileV2).ids) &&
    Array.isArray((f as FavoritesFileV2).items)
  );
}

async function migrateV1(rawIds: number[]): Promise<FavoritesFileV2> {
  const wanted = new Set(rawIds.filter((n) => Number.isInteger(n)));
  const found = new Map<number, AnimeDetail>();
  if (wanted.size > 0) {
    for (const def of CATEGORIES) {
      if (found.size >= wanted.size) break;
      const cache = await getCachedCategory(def.id);
      for (const a of cache ?? []) {
        if (wanted.has(a.aid) && !found.has(a.aid)) found.set(a.aid, a);
      }
    }
  }
  const file: FavoritesFileV2 = {
    version: 2,
    ids: Array.from(wanted).sort((a, b) => a - b),
    items: Array.from(found.values()),
  };
  await writeJson(STORAGE_KEY, file);
  return file;
}

let migrating: Promise<FavoritesFileV2> | null = null;

async function loadFile(): Promise<FavoritesFileV2> {
  const stored = await readJson<FavoritesFileV1 | FavoritesFileV2 | null>(STORAGE_KEY, null);
  if (isV2(stored)) return stored;
  if (!migrating) {
    const v1Ids =
      stored && Array.isArray((stored as FavoritesFileV1).favorites)
        ? (stored as FavoritesFileV1).favorites
        : [];
    migrating = migrateV1(v1Ids).finally(() => {
      migrating = null;
    });
  }
  return migrating;
}

export async function loadFavorites(): Promise<Set<number>> {
  const file = await loadFile();
  return new Set(file.ids);
}

/** Favorited titles with a stored snapshot, alpha-sorted for the Favorites tab. */
export async function loadFavoriteItems(): Promise<AnimeDetail[]> {
  const file = await loadFile();
  return [...file.items].sort((a, b) => a.title.localeCompare(b.title));
}

export async function toggleFavorite(anime: AnimeDetail): Promise<boolean> {
  const file = await loadFile();
  const wasFavorite = file.ids.includes(anime.aid);
  const next: FavoritesFileV2 = wasFavorite
    ? {
        version: 2,
        ids: file.ids.filter((id) => id !== anime.aid),
        items: file.items.filter((i) => i.aid !== anime.aid),
      }
    : {
        version: 2,
        ids: [...file.ids, anime.aid].sort((a, b) => a - b),
        items: [...file.items.filter((i) => i.aid !== anime.aid), anime],
      };
  await writeJson(STORAGE_KEY, next);
  return !wasFavorite;
}

/** Backfill the snapshot for an already-favorited title (favorited before v2). */
export async function recordFavoriteSnapshot(anime: AnimeDetail): Promise<void> {
  const file = await loadFile();
  if (!file.ids.includes(anime.aid)) return;
  if (file.items.some((i) => i.aid === anime.aid)) return;
  await writeJson<FavoritesFileV2>(STORAGE_KEY, {
    ...file,
    items: [...file.items, anime],
  });
}
