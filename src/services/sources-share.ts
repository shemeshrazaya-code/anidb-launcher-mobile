import { Source, validateSource } from '@/src/types/source';

const FORMAT = 'anime-db-sources/v1';

export interface SourcesBundle {
  format: typeof FORMAT;
  exportedAt: string;
  sources: Source[];
}

export function serializeSources(sources: Source[]): string {
  const bundle: SourcesBundle = {
    format: FORMAT,
    exportedAt: new Date().toISOString(),
    sources,
  };
  return JSON.stringify(bundle, null, 2);
}

export class SourcesParseError extends Error {}

export function parseSources(input: string): Source[] {
  const trimmed = input.trim();
  if (!trimmed) throw new SourcesParseError('Nothing to import — paste a sources bundle.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new SourcesParseError("That doesn't look like JSON.");
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new SourcesParseError('Expected a JSON object.');
  }
  const obj = parsed as Record<string, unknown>;

  let raw: unknown[];
  if (obj.format === FORMAT && Array.isArray(obj.sources)) {
    raw = obj.sources;
  } else if (Array.isArray(obj.sources)) {
    // Tolerate older or unversioned bundles that still have a `sources` array.
    raw = obj.sources;
  } else if (Array.isArray(parsed)) {
    raw = parsed as unknown[];
  } else {
    throw new SourcesParseError(
      'No sources found. Expected `{ "sources": [...] }` or a plain array.',
    );
  }

  const out: Source[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== 'object') {
      throw new SourcesParseError(`Source #${i + 1} is not an object.`);
    }
    const candidate: Source = {
      name: String((item as Record<string, unknown>).name ?? '').trim(),
      searchUrlTemplate: String((item as Record<string, unknown>).searchUrlTemplate ?? '').trim(),
    };
    try {
      validateSource(candidate);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new SourcesParseError(`Source #${i + 1} is invalid: ${msg}`);
    }
    out.push(candidate);
  }

  if (out.length === 0) {
    throw new SourcesParseError('Bundle had no sources.');
  }
  return out;
}

export type ImportMode = 'replace' | 'merge';

/**
 * Merge incoming sources into existing, dedup by name (case-insensitive).
 * Existing wins on name conflict.
 */
export function mergeSources(existing: Source[], incoming: Source[]): {
  merged: Source[];
  added: number;
  skipped: number;
} {
  const byName = new Map<string, Source>();
  for (const s of existing) byName.set(s.name.toLowerCase(), s);
  let added = 0;
  let skipped = 0;
  for (const s of incoming) {
    const key = s.name.toLowerCase();
    if (byName.has(key)) {
      skipped += 1;
    } else {
      byName.set(key, s);
      added += 1;
    }
  }
  return { merged: Array.from(byName.values()), added, skipped };
}
