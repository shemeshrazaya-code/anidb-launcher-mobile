import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadFavorites, saveFavorites, toggleFavorite } from '../favorites';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('favorites storage', () => {
  it('starts empty', async () => {
    expect(Array.from(await loadFavorites())).toEqual([]);
  });

  it('round-trips a set', async () => {
    await saveFavorites(new Set([3, 1, 2]));
    const loaded = await loadFavorites();
    expect(Array.from(loaded).sort()).toEqual([1, 2, 3]);
  });

  it('toggle adds when missing and returns true', async () => {
    expect(await toggleFavorite(42)).toBe(true);
    expect(Array.from(await loadFavorites())).toEqual([42]);
  });

  it('toggle removes when present and returns false', async () => {
    await saveFavorites(new Set([42]));
    expect(await toggleFavorite(42)).toBe(false);
    expect(Array.from(await loadFavorites())).toEqual([]);
  });

  it('discards non-integer entries on load', async () => {
    await AsyncStorage.setItem('favorites', JSON.stringify({ favorites: [1, 'x', 2.5, 3] }));
    expect(Array.from(await loadFavorites()).sort()).toEqual([1, 3]);
  });
});
