import { AnimeDetail } from '@/src/types/anime';
import { readJson, writeJson } from './storage';

const API_URL = 'https://graphql.anilist.co';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
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

const TOP_QUERY = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage total }
    media(type: ANIME, sort: POPULARITY_DESC) { ${MEDIA_FIELDS} }
  }
}`;

const TRENDING_QUERY = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage total }
    media(type: ANIME, sort: TRENDING_DESC) { ${MEDIA_FIELDS} }
  }
}`;

const HENTAI_POPULARITY_QUERY = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage total }
    media(type: ANIME, sort: POPULARITY_DESC, genre_in: ["Hentai"]) { ${MEDIA_FIELDS} }
  }
}`;

const HENTAI_SCORE_QUERY = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage total }
    media(type: ANIME, sort: SCORE_DESC, genre_in: ["Hentai"]) { ${MEDIA_FIELDS} }
  }
}`;

const SEARCH_QUERY = `query ($search: String, $page: Int, $perPage: Int, $isAdult: Boolean) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage total }
    media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: $isAdult) { ${MEDIA_FIELDS} }
  }
}`;

export type Category = 'top' | 'trending' | 'hentai';

interface QueryPhase {
  query: string;
  pages: number;
  label: string;
}

interface CategoryConfig {
  phases: QueryPhase[];
  cacheKey: string;
}

const CATEGORIES: Record<Category, CategoryConfig> = {
  top: {
    cacheKey: 'anilist-cache-top-v2',
    phases: [{ query: TOP_QUERY, pages: 60, label: 'top' }],
  },
  trending: {
    cacheKey: 'anilist-cache-trending-v2',
    phases: [{ query: TRENDING_QUERY, pages: 20, label: 'trending' }],
  },
  hentai: {
    cacheKey: 'anilist-cache-hentai-v2',
    phases: [
      { query: HENTAI_POPULARITY_QUERY, pages: 40, label: 'hentai (popular)' },
      { query: HENTAI_SCORE_QUERY, pages: 30, label: 'hentai (top-rated)' },
    ],
  },
};

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
  category: Category;
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

async function postGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
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
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '30', 10);
    await new Promise((r) => setTimeout(r, Math.min(Math.max(retryAfter, 1), 90) * 1000));
    return postGraphql<T>(query, variables);
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

export async function getCategory(category: Category, opts: FetchOptions = {}): Promise<AnimeDetail[]> {
  const { cacheKey, phases } = CATEGORIES[category];
  const cached = await readJson<CacheEnvelope | null>(cacheKey, null);
  const fresh = cached && Date.now() - cached.fetchedAt < CACHE_MAX_AGE_MS;
  if (cached && fresh && cached.full && !opts.forceRefresh) {
    return cached.items;
  }

  const seen = new Set<number>(cached?.items.map((a) => a.aid) ?? []);
  const out: AnimeDetail[] = cached ? [...cached.items] : [];
  const totalPages = phases.reduce((sum, p) => sum + p.pages, 0);
  let pageDone = 0;

  for (const phase of phases) {
    for (let page = 1; page <= phase.pages; page += 1) {
      if (opts.signal?.cancelled) {
        await writeJson<CacheEnvelope>(cacheKey, { fetchedAt: Date.now(), items: out, full: false });
        return out;
      }
      const data = await postGraphql<AniListPageResponse['data']>(phase.query, {
        page,
        perPage: 50,
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
        await writeJson<CacheEnvelope>(cacheKey, {
          fetchedAt: Date.now(),
          items: out,
          full: false,
        });
      }
      if (!data.Page.pageInfo.hasNextPage) break;
    }
  }

  await writeJson<CacheEnvelope>(cacheKey, { fetchedAt: Date.now(), items: out, full: true });
  return out;
}

export async function getCachedCategory(category: Category): Promise<AnimeDetail[] | null> {
  const cached = await readJson<CacheEnvelope | null>(CATEGORIES[category].cacheKey, null);
  return cached ? cached.items : null;
}

export async function getCachedAnyCategory(aid: number): Promise<AnimeDetail | null> {
  for (const cat of Object.keys(CATEGORIES) as Category[]) {
    const items = await getCachedCategory(cat);
    const found = items?.find((a) => a.aid === aid);
    if (found) return found;
  }
  return null;
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
