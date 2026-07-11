import { AnimeDetail } from '@/src/types/anime';
import { readCacheJson, writeCacheJson } from './cache-storage';

const API_URL = 'https://graphql.anilist.co';
const RATE_LIMIT_DELAY_MS = 1200;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const MEDIA_FIELDS = `
  id
  title { romaji english native userPreferred }
  synonyms
  description(asHtml: false)
  averageScore
  popularity
  coverImage { medium large }
  format
  episodes
  genres
  season
  seasonYear
  startDate { year month day }
  isAdult
`;

const BROWSE_QUERY = `query (
  $page: Int,
  $perPage: Int,
  $sort: [MediaSort],
  $status: MediaStatus,
  $format: MediaFormat,
  $genres: [String]
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage total }
    media(type: ANIME, sort: $sort, status: $status, format: $format, genre_in: $genres) { ${MEDIA_FIELDS} }
  }
}`;

const DETAIL_QUERY = `query ($id: Int) {
  Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} }
}`;

const SEARCH_QUERY = `query ($search: String, $page: Int, $perPage: Int, $isAdult: Boolean) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage total }
    media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: $isAdult) { ${MEDIA_FIELDS} }
  }
}`;

export type CategoryId = string;
/** Backwards-compat alias - some screens still import `Category`. */
export type Category = CategoryId;

export interface CategoryPhase {
  vars: Record<string, unknown>;
  pages: number;
  label: string;
}

export interface CategoryDef {
  id: CategoryId;
  name: string;
  description: string;
  phases: CategoryPhase[];
  cacheKey: string;
  /** Marks adult-only categories for opt-in gating. */
  adult?: boolean;
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'top',
    name: 'Top Popular',
    description: 'All-time most popular anime on AniList',
    phases: [{ vars: { sort: ['POPULARITY_DESC'] }, pages: 60, label: 'top popular' }],
    cacheKey: 'anilist-cache-top-v2',
  },
  {
    id: 'trending',
    name: 'Trending Now',
    description: "What's hot this week",
    phases: [{ vars: { sort: ['TRENDING_DESC'] }, pages: 20, label: 'trending' }],
    cacheKey: 'anilist-cache-trending-v2',
  },
  {
    id: 'top-rated',
    name: 'Top Rated',
    description: 'Highest AniList user scores',
    phases: [{ vars: { sort: ['SCORE_DESC'] }, pages: 25, label: 'top rated' }],
    cacheKey: 'anilist-cache-top-rated-v1',
  },
  {
    id: 'most-favorited',
    name: 'Most Favorited',
    description: "Most-favorited by AniList users",
    phases: [{ vars: { sort: ['FAVOURITES_DESC'] }, pages: 25, label: 'most favorited' }],
    cacheKey: 'anilist-cache-most-favorited-v1',
  },
  {
    id: 'currently-airing',
    name: 'Currently Airing',
    description: 'Anime running this season',
    phases: [{ vars: { sort: ['POPULARITY_DESC'], status: 'RELEASING' }, pages: 15, label: 'airing' }],
    cacheKey: 'anilist-cache-airing-v1',
  },
  {
    id: 'upcoming',
    name: 'Upcoming',
    description: 'Announced and not yet released',
    phases: [{ vars: { sort: ['POPULARITY_DESC'], status: 'NOT_YET_RELEASED' }, pages: 10, label: 'upcoming' }],
    cacheKey: 'anilist-cache-upcoming-v1',
  },
  {
    id: 'newest',
    name: 'Newest Releases',
    description: 'Most recently aired',
    phases: [{ vars: { sort: ['START_DATE_DESC'], status: 'FINISHED' }, pages: 20, label: 'newest' }],
    cacheKey: 'anilist-cache-newest-v1',
  },
  {
    id: 'movies',
    name: 'Movies',
    description: 'Theatrical and feature-length anime',
    phases: [{ vars: { sort: ['POPULARITY_DESC'], format: 'MOVIE' }, pages: 25, label: 'movies' }],
    cacheKey: 'anilist-cache-movies-v1',
  },
  {
    id: 'tv-series',
    name: 'TV Series',
    description: 'Anime TV series',
    phases: [{ vars: { sort: ['POPULARITY_DESC'], format: 'TV' }, pages: 30, label: 'tv series' }],
    cacheKey: 'anilist-cache-tv-v1',
  },
  {
    id: 'ovas',
    name: 'OVAs',
    description: 'Original Video Animations',
    phases: [{ vars: { sort: ['POPULARITY_DESC'], format: 'OVA' }, pages: 15, label: 'ovas' }],
    cacheKey: 'anilist-cache-ovas-v1',
  },
  {
    id: 'specials',
    name: 'Specials',
    description: 'TV specials and promotional shorts',
    phases: [{ vars: { sort: ['POPULARITY_DESC'], format: 'SPECIAL' }, pages: 10, label: 'specials' }],
    cacheKey: 'anilist-cache-specials-v1',
  },
  {
    id: 'hentai',
    name: 'Hentai',
    description: 'Adult anime — popularity and score blend',
    phases: [
      { vars: { sort: ['POPULARITY_DESC'], genres: ['Hentai'] }, pages: 40, label: 'hentai (popular)' },
      { vars: { sort: ['SCORE_DESC'], genres: ['Hentai'] }, pages: 30, label: 'hentai (top-rated)' },
    ],
    cacheKey: 'anilist-cache-hentai-v2',
    adult: true,
  },
];

export const DEFAULT_CATEGORY: CategoryId = 'top';

export function getCategoryDef(id: CategoryId): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

interface AniListMedia {
  id: number;
  title: { romaji?: string; english?: string; native?: string; userPreferred?: string };
  synonyms?: string[];
  description?: string;
  averageScore?: number | null;
  popularity?: number | null;
  coverImage?: { medium?: string; large?: string };
  format?: string | null;
  episodes?: number | null;
  genres?: string[];
  season?: string | null;
  seasonYear?: number | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null };
  isAdult?: boolean;
}

interface AniListPageResponse {
  data: {
    Page: {
      pageInfo: { hasNextPage: boolean; currentPage: number; total: number };
      media: AniListMedia[];
    };
  };
  errors?: unknown;
}

interface CacheEnvelope {
  fetchedAt: number;
  items: AnimeDetail[];
  /** Set when fetchedAt was a partial fetch; full means all phases completed */
  full?: boolean;
}

export interface FetchProgress {
  category: CategoryId;
  phase: string;
  pageDone: number;
  totalPages: number;
  itemCount: number;
  items: AnimeDetail[];
}

export class AniListError extends Error {}

const TAG_RE = /<[^>]+>/g;
const BR_RE = /<br\s*\/?>/gi;

function stripHtml(s: string | undefined | null): string {
  if (!s) return '';
  return s.replace(BR_RE, '\n').replace(TAG_RE, '').trim();
}

function mediaToDetail(m: AniListMedia): AnimeDetail {
  const t = m.title || {};
  const titleEn = (t.english || '').trim();
  const titleRo = (t.romaji || '').trim();
  const titleNative = (t.native || '').trim();
  const titlePref = (t.userPreferred || '').trim();
  const primary = titleEn || titleRo || titlePref || '(untitled)';

  const altTitles: string[] = [];
  for (const cand of [titleEn, titleRo, titleNative, titlePref, ...(m.synonyms || [])]) {
    const s = (cand || '').trim();
    if (s && s !== primary && !altTitles.includes(s)) altTitles.push(s);
  }

  const avg = m.averageScore;
  const rating = avg != null ? avg / 10.0 : null;
  const cover = m.coverImage || {};
  const pictureUrl = cover.large || cover.medium || null;
  const genres = (m.genres || []).filter(Boolean);

  const sd = m.startDate || {};
  const seasonYear = m.seasonYear ?? sd.year ?? null;
  const seasonName = (m.season || '').trim();
  let season: string | null = null;
  if (seasonName && seasonYear) {
    season = `${seasonName.charAt(0).toUpperCase()}${seasonName.slice(1).toLowerCase()} ${seasonYear}`;
  } else if (seasonYear) {
    season = String(seasonYear);
  }

  let startDate: string | null = null;
  if (sd.year && sd.month && sd.day) {
    startDate = `${sd.year.toString().padStart(4, '0')}-${sd.month
      .toString()
      .padStart(2, '0')}-${sd.day.toString().padStart(2, '0')}`;
  } else if (sd.year && sd.month) {
    startDate = `${sd.year.toString().padStart(4, '0')}-${sd.month.toString().padStart(2, '0')}`;
  } else if (sd.year) {
    startDate = sd.year.toString().padStart(4, '0');
  }

  return {
    aid: m.id,
    title: primary,
    description: stripHtml(m.description),
    rating,
    ratingCount: m.popularity ?? null,
    pictureUrl,
    type: m.format ?? null,
    episodeCount: m.episodes ?? null,
    genres: genres.length > 0 ? genres : null,
    season,
    isAdult: !!m.isAdult,
    startDate,
    altTitles: altTitles.length > 0 ? altTitles : null,
  };
}

let lastCallAt = 0;
async function rateLimit(): Promise<void> {
  const elapsed = Date.now() - lastCallAt;
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS - elapsed));
  }
  lastCallAt = Date.now();
}

const MAX_RATE_LIMIT_RETRIES = 5;

async function postGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  attempt = 0,
): Promise<T> {
  await rateLimit();
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': BROWSER_UA,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 429) {
    if (attempt >= MAX_RATE_LIMIT_RETRIES) {
      throw new AniListError('AniList rate limit persisted after retries');
    }
    // Retry-After may be an HTTP-date instead of seconds; NaN would make
    // setTimeout fire immediately and hammer the API.
    const parsed = parseInt(res.headers.get('Retry-After') ?? '', 10);
    const retryAfter = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 90) : 30;
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return postGraphql<T>(query, variables, attempt + 1);
  }
  if (!res.ok) {
    throw new AniListError(`AniList HTTP ${res.status}`);
  }
  const json = (await res.json()) as { data: T; errors?: unknown };
  if (json.errors) {
    throw new AniListError(`AniList GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

interface FetchOptions {
  forceRefresh?: boolean;
  onProgress?: (p: FetchProgress) => void;
  signal?: { cancelled: boolean };
}

export async function getCategory(category: CategoryId, opts: FetchOptions = {}): Promise<AnimeDetail[]> {
  const def = getCategoryDef(category);
  if (!def) throw new AniListError(`Unknown category: ${category}`);
  const { cacheKey, phases } = def;
  const cached = await readCacheJson<CacheEnvelope | null>(cacheKey, null);
  // Trust cache forever absent forceRefresh. Partial caches (full !== true) still
  // trigger a continue-from-where-we-left-off fetch.
  if (cached && cached.full && !opts.forceRefresh) {
    return cached.items;
  }

  const seen = new Set<number>(cached?.items.map((a) => a.aid) ?? []);
  const out: AnimeDetail[] = cached ? [...cached.items] : [];
  const totalPages = phases.reduce((sum, p) => sum + p.pages, 0);
  let pageDone = 0;

  for (const phase of phases) {
    for (let page = 1; page <= phase.pages; page += 1) {
      if (opts.signal?.cancelled) {
        await writeCacheJson<CacheEnvelope>(cacheKey, { fetchedAt: Date.now(), items: out, full: false });
        return out;
      }
      const data = await postGraphql<AniListPageResponse['data']>(BROWSE_QUERY, {
        page,
        perPage: 50,
        ...phase.vars,
      });
      for (const m of data.Page.media) {
        if (m.id == null || seen.has(m.id)) continue;
        seen.add(m.id);
        out.push(mediaToDetail(m));
      }
      pageDone += 1;
      opts.onProgress?.({
        category,
        phase: phase.label,
        pageDone,
        totalPages,
        itemCount: out.length,
        items: out.slice(),
      });
      // Save partial progress every 5 pages so a crash mid-fetch isn't lost
      if (pageDone % 5 === 0) {
        await writeCacheJson<CacheEnvelope>(cacheKey, {
          fetchedAt: Date.now(),
          items: out,
          full: false,
        });
      }
      if (!data.Page.pageInfo.hasNextPage) break;
    }
  }

  await writeCacheJson<CacheEnvelope>(cacheKey, { fetchedAt: Date.now(), items: out, full: true });
  return out;
}

export async function getCachedCategory(category: CategoryId): Promise<AnimeDetail[] | null> {
  const def = getCategoryDef(category);
  if (!def) return null;
  const cached = await readCacheJson<CacheEnvelope | null>(def.cacheKey, null);
  return cached ? cached.items : null;
}

export async function getCachedAnyCategory(aid: number): Promise<AnimeDetail | null> {
  for (const def of CATEGORIES) {
    const cached = await readCacheJson<CacheEnvelope | null>(def.cacheKey, null);
    const found = cached?.items.find((a) => a.aid === aid);
    if (found) return found;
  }
  return null;
}

/** Fetch a single title from AniList by id — fallback for items not in any cache. */
export async function getAnimeById(aid: number): Promise<AnimeDetail | null> {
  const data = await postGraphql<{ Media: AniListMedia | null }>(DETAIL_QUERY, { id: aid });
  return data.Media ? mediaToDetail(data.Media) : null;
}

export async function searchAnime(
  query: string,
  opts: { includeAdult?: boolean } = {},
): Promise<AnimeDetail[]> {
  if (!query.trim()) return [];
  const data = await postGraphql<AniListPageResponse['data']>(SEARCH_QUERY, {
    search: query.trim(),
    page: 1,
    perPage: 50,
    isAdult: opts.includeAdult ?? null,
  });
  return data.Page.media.map(mediaToDetail);
}
