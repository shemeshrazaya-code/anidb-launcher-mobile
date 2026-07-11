import { AnimeDetail } from '@/src/types/anime';

jest.mock('../cache-storage', () => {
  const store = new Map<string, unknown>();
  return {
    __esModule: true,
    __store: store,
    readCacheJson: jest.fn(async (key: string, fallback: unknown) =>
      store.has(key) ? store.get(key) : fallback,
    ),
    writeCacheJson: jest.fn(async (key: string, value: unknown) => {
      store.set(key, JSON.parse(JSON.stringify(value)));
    }),
    removeCache: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    migrateAsyncStorageKeys: jest.fn(async () => ({ migrated: 0, removed: 0, failed: 0 })),
  };
});

import { getCategory, searchAnime } from '../anilist';

const cacheStore = (jest.requireMock('../cache-storage') as { __store: Map<string, unknown> })
  .__store;

const fetchMock = jest.fn();
(global as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;

interface CacheEnvelope {
  fetchedAt: number;
  items: AnimeDetail[];
  full?: boolean;
}

function fakeItem(aid: number, title = `Cached ${aid}`): AnimeDetail {
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

function pageResponse(ids: number[], hasNextPage = false) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => ({
      data: {
        Page: {
          pageInfo: { hasNextPage, currentPage: 1, total: ids.length },
          media: ids.map((id) => ({ id, title: { romaji: `Anime ${id}` } })),
        },
      },
    }),
  };
}

/** Drive the rate-limit / retry timers until the fetch loop settles. */
async function settle<T>(promise: Promise<T>): Promise<T> {
  await jest.runAllTimersAsync();
  return promise;
}

beforeEach(() => {
  jest.useFakeTimers();
  cacheStore.clear();
  fetchMock.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('getCategory freshness', () => {
  it('serves a fresh full cache without hitting the network', async () => {
    cacheStore.set('anilist-cache-trending-v2', {
      fetchedAt: Date.now(),
      items: [fakeItem(1)],
      full: true,
    } satisfies CacheEnvelope);

    const items = await settle(getCategory('trending'));
    expect(items.map((a) => a.aid)).toEqual([1]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('trusts a trust-forever category (top) even when very old', async () => {
    cacheStore.set('anilist-cache-top-v2', {
      fetchedAt: Date.now() - 365 * 24 * 3_600_000,
      items: [fakeItem(1)],
      full: true,
    } satisfies CacheEnvelope);

    const items = await settle(getCategory('top'));
    expect(items.map((a) => a.aid)).toEqual([1]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rebuilds a stale trending cache: fresh order wins, gone items drop', async () => {
    cacheStore.set('anilist-cache-trending-v2', {
      fetchedAt: Date.now() - 13 * 3_600_000, // past the 12h window
      items: [fakeItem(1, 'Old Title'), fakeItem(2)],
      full: true,
    } satisfies CacheEnvelope);
    fetchMock.mockResolvedValueOnce(pageResponse([3, 1]));

    const items = await settle(getCategory('trending'));
    // Fresh fetch order, refreshed metadata, and aid 2 (no longer trending) dropped.
    expect(items.map((a) => a.aid)).toEqual([3, 1]);
    expect(items[1].title).toBe('Anime 1');
    const envelope = cacheStore.get('anilist-cache-trending-v2') as CacheEnvelope;
    expect(envelope.full).toBe(true);
    expect(envelope.items.map((a) => a.aid)).toEqual([3, 1]);
  });

  it('forceRefresh rebuilds clean even when the cache is fresh', async () => {
    cacheStore.set('anilist-cache-trending-v2', {
      fetchedAt: Date.now(),
      items: [fakeItem(1)],
      full: true,
    } satisfies CacheEnvelope);
    fetchMock.mockResolvedValueOnce(pageResponse([2]));

    const items = await settle(getCategory('trending', { forceRefresh: true }));
    expect(items.map((a) => a.aid)).toEqual([2]);
  });

  it('resumes a partial cache, keeping existing items and their metadata', async () => {
    cacheStore.set('anilist-cache-trending-v2', {
      fetchedAt: Date.now(),
      items: [fakeItem(1, 'Old Title')],
      full: false,
    } satisfies CacheEnvelope);
    fetchMock.mockResolvedValueOnce(pageResponse([1, 2]));

    const items = await settle(getCategory('trending'));
    expect(items.map((a) => a.aid)).toEqual([1, 2]);
    expect(items[0].title).toBe('Old Title');
  });

  it('keeps the old full cache when a rebuild is cancelled', async () => {
    cacheStore.set('anilist-cache-trending-v2', {
      fetchedAt: Date.now() - 13 * 3_600_000,
      items: [fakeItem(1)],
      full: true,
    } satisfies CacheEnvelope);

    const items = await settle(getCategory('trending', { signal: { cancelled: true } }));
    expect(items).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    const envelope = cacheStore.get('anilist-cache-trending-v2') as CacheEnvelope;
    expect(envelope.full).toBe(true);
    expect(envelope.items.map((a) => a.aid)).toEqual([1]);
  });

  it('newest bounds the date window and includes airing shows', async () => {
    fetchMock.mockResolvedValueOnce(pageResponse([5]));

    await settle(getCategory('newest'));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(String(body.variables.startDateLesser)).toMatch(/^\d{8}$/);
    // Excludes null-date entries, which AniList sorts first in START_DATE_DESC.
    expect(body.variables.startDateGreater).toBe(19000101);
    expect(body.variables.statusIn).toEqual(['RELEASING', 'FINISHED']);
    expect(body.variables.status).toBeUndefined();
    expect(cacheStore.has('anilist-cache-newest-v2')).toBe(true);
  });
});

describe('429 handling', () => {
  it('recovers when Retry-After is an HTTP-date instead of seconds', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => 'Fri, 11 Jul 2026 20:00:00 GMT' },
        json: async () => ({}),
      })
      .mockResolvedValueOnce(pageResponse([7]));

    const results = await settle(searchAnime('naruto'));
    expect(results.map((a) => a.aid)).toEqual([7]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
