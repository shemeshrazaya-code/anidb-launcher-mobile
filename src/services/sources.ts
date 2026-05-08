import defaultSources from '@/src/data/default_sources.json';
import { Source, SourceError, validateSource } from '@/src/types/source';
import { readJson, writeJson } from './storage';

const STORAGE_KEY = 'sources';

interface SourcesFile {
  sources: Source[];
}

export async function loadSources(): Promise<Source[]> {
  const stored = await readJson<SourcesFile | null>(STORAGE_KEY, null);
  if (stored && Array.isArray(stored.sources)) {
    return stored.sources;
  }
  return (defaultSources as SourcesFile).sources;
}

export async function saveSources(sources: Source[]): Promise<void> {
  await writeJson<SourcesFile>(STORAGE_KEY, { sources });
}

export async function addSource(source: Source): Promise<Source[]> {
  validateSource(source);
  const sources = await loadSources();
  if (sources.some((s) => s.name === source.name)) {
    throw new SourceError(`source name already exists: ${source.name}`);
  }
  const next = [...sources, source];
  await saveSources(next);
  return next;
}

export async function removeSource(name: string): Promise<Source[]> {
  const sources = await loadSources();
  const next = sources.filter((s) => s.name !== name);
  if (next.length === sources.length) {
    throw new SourceError(`no source named ${name}`);
  }
  await saveSources(next);
  return next;
}
