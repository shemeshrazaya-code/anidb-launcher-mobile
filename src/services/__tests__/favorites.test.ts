import AsyncStorage from '@react-native-async-storage/async-storage';

import { AnimeDetail } from '@/src/types/anime';
import {
  loadFavoriteItems,
  loadFavorites,
  recordFavoriteSnapshot,
  toggleFavorite,
} from '../favorites';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/',
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  makeDirectoryAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

function fakeAnime(aid: number, title = `Anime ${aid}`): AnimeDetail {
  return {
    aid,
    title,
    description: '',
    rating: null,
    ratingCount: null,
    pictureUrl: null,
    type: null,
    episodeCount: null,
    genres: null,
    season: null,
    isAdult: false,
    startDate: null,
    altTitles: null,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('favorites storage', () => {
  it('starts empty', async () => {
    expect(Array.from(await loadFavorites())).toEqual([]);
    expect(await loadFavoriteItems()).toEqual([]);
  });

  it('toggle adds when missing and returns true', async () => {
    expect(await toggleFavorite(fakeAnime(42))).toBe(true);
    expect(Array.from(await loadFavorites())).toEqual([42]);
    expect((await loadFavoriteItems()).map((a) => a.aid)).toEqual([42]);
  });

  it('toggle removes when present and returns false', async () => {
    await toggleFavorite(fakeAnime(42));
    expect(await toggleFavorite(fakeAnime(42))).toBe(false);
    expect(Array.from(await loadFavorites())).toEqual([]);
    expect(await loadFavoriteItems()).toEqual([]);
  });

  it('sorts favorite items alphabetically by title', async () => {
    await toggleFavorite(fakeAnime(1, 'Zeta'));
    await toggleFavorite(fakeAnime(2, 'Akira'));
    expect((await loadFavoriteItems()).map((a) => a.title)).toEqual(['Akira', 'Zeta']);
  });

  it('migrates a v1 id-only file, keeping integer ids', async () => {
    await AsyncStorage.setItem('favorites', JSON.stringify({ favorites: [1, 'x', 2.5, 3] }));
    expect(Array.from(await loadFavorites()).sort()).toEqual([1, 3]);
    // Snapshots for pre-v2 favorites are unknown until the title is next opened.
    expect(await loadFavoriteItems()).toEqual([]);
  });

  it('backfills a snapshot for a migrated favorite via recordFavoriteSnapshot', async () => {
    await AsyncStorage.setItem('favorites', JSON.stringify({ favorites: [7] }));
    await recordFavoriteSnapshot(fakeAnime(7, 'Backfilled'));
    expect((await loadFavoriteItems()).map((a) => a.title)).toEqual(['Backfilled']);
  });

  it('does not record a snapshot for a non-favorited title', async () => {
    await toggleFavorite(fakeAnime(1));
    await recordFavoriteSnapshot(fakeAnime(99));
    expect((await loadFavoriteItems()).map((a) => a.aid)).toEqual([1]);
  });
});
