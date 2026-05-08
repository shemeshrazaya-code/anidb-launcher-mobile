import { AnimeDetail } from '@/src/types/anime';
import { readJson, writeJson } from './storage';

const API_URL = 'https://graphql.anilist.co';
const CACHE_KEY = 'anilist-top-cache';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const QUERY = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage total }
    media(type: ANIME, sort: POPULARITY_DESC) {
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
    }
  }
}`;

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

async function fetchPage(page: number, perPage: number): Promise<AniListMedia[]> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': BROWSER_UA,
    },
    body: JSON.stringify({ query: QUERY, variables: { page, perPage } }),
  });
  if (!res.ok) {
    throw new AniListError(`AniList HTTP ${res.status}`);
  }
  const json = (await res.json()) as AniListPageResponse;
  if (json.errors) {
    throw new AniListError(`AniList GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json.data.Page.media;
}

export async function getTopAnime(opts: { forceRefresh?: boolean; pages?: number } = {}): Promise<AnimeDetail[]> {
  const { forceRefresh = false, pages = 3 } = opts;
  if (!forceRefresh) {
    const cached = await readJson<CacheEnvelope | null>(CACHE_KEY, null);
    if (cached && Date.now() - cached.fetchedAt < CACHE_MAX_AGE_MS && cached.items.length > 0) {
      return cached.items;
    }
  }

  const seen = new Set<number>();
  const out: AnimeDetail[] = [];
  for (let page = 1; page <= pages; page += 1) {
    const media = await fetchPage(page, 50);
    for (const m of media) {
      if (m.id == null || seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(mediaToDetail(m));
    }
    if (media.length === 0) break;
  }

  await writeJson<CacheEnvelope>(CACHE_KEY, { fetchedAt: Date.now(), items: out });
  return out;
}

export async function getCachedTopAnime(): Promise<AnimeDetail[] | null> {
  const cached = await readJson<CacheEnvelope | null>(CACHE_KEY, null);
  return cached ? cached.items : null;
}
