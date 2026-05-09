import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { migrateAsyncStorageKeys } from '../cache-storage';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/',
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  makeDirectoryAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

const fsMock = FileSystem as jest.Mocked<typeof FileSystem>;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  fsMock.getInfoAsync.mockResolvedValue({ exists: true, isDirectory: true } as never);
});

describe('cache storage migration', () => {
  it('moves matching AsyncStorage cache entries to the file-system cache', async () => {
    const key = 'anilist-cache-top-v2';
    const raw = JSON.stringify({ fetchedAt: 1, items: [], full: true });
    await AsyncStorage.setItem(key, raw);
    await AsyncStorage.setItem('sources', '{"sources":[]}');

    await expect(migrateAsyncStorageKeys('anilist-cache-')).resolves.toEqual({
      migrated: 1,
      removed: 1,
      failed: 0,
    });

    expect(fsMock.writeAsStringAsync).toHaveBeenCalledWith(
      'file:///mock/cache/anilist-cache-top-v2.json',
      raw,
    );
    await expect(AsyncStorage.getItem(key)).resolves.toBeNull();
    await expect(AsyncStorage.getItem('sources')).resolves.toBe('{"sources":[]}');
  });

  it('deletes an unreadable oversized cache entry so SQLite storage can recover', async () => {
    const key = 'anilist-cache-huge-v1';
    await AsyncStorage.setItem(key, 'too-large-to-read');
    const getItem = jest.spyOn(AsyncStorage, 'getItem');
    getItem.mockImplementationOnce(async () => {
      throw new Error('Row too big to fit into CursorWindow');
    });
    const removeItem = jest.spyOn(AsyncStorage, 'removeItem');

    await expect(migrateAsyncStorageKeys('anilist-cache-')).resolves.toEqual({
      migrated: 0,
      removed: 1,
      failed: 1,
    });

    expect(fsMock.writeAsStringAsync).not.toHaveBeenCalled();
    expect(removeItem).toHaveBeenCalledWith(key);
  });

  it('keeps the AsyncStorage cache if the file-system write fails', async () => {
    const key = 'anilist-cache-top-v2';
    await AsyncStorage.setItem(key, '{"items":[]}');
    fsMock.writeAsStringAsync.mockRejectedValueOnce(new Error('disk full'));

    await expect(migrateAsyncStorageKeys('anilist-cache-')).resolves.toEqual({
      migrated: 0,
      removed: 0,
      failed: 1,
    });

    await expect(AsyncStorage.getItem(key)).resolves.toBe('{"items":[]}');
  });
});
