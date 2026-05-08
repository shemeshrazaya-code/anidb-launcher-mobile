import { readJson, writeJson } from './storage';

const STORAGE_KEY = 'favorites';

interface FavoritesFile {
  favorites: number[];
}

export async function loadFavorites(): Promise<Set<number>> {
  const stored = await readJson<FavoritesFile | null>(STORAGE_KEY, null);
  if (!stored || !Array.isArray(stored.favorites)) return new Set();
  return new Set(stored.favorites.filter((n) => Number.isInteger(n)));
}

export async function saveFavorites(favorites: Set<number>): Promise<void> {
  const sorted = Array.from(favorites).sort((a, b) => a - b);
  await writeJson<FavoritesFile>(STORAGE_KEY, { favorites: sorted });
}

export async function toggleFavorite(aid: number): Promise<boolean> {
  const favorites = await loadFavorites();
  const wasFavorite = favorites.has(aid);
  if (wasFavorite) {
    favorites.delete(aid);
  } else {
    favorites.add(aid);
  }
  await saveFavorites(favorites);
  return !wasFavorite;
}
