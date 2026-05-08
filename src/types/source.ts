export const QUERY_PLACEHOLDER = '{query}';

export interface Source {
  name: string;
  searchUrlTemplate: string;
}

export class SourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceError';
  }
}

export function validateSource(source: Source): void {
  if (!source.name.trim()) {
    throw new SourceError('source name must be non-empty');
  }
  if (!source.searchUrlTemplate.includes(QUERY_PLACEHOLDER)) {
    throw new SourceError(
      `search URL template must contain ${QUERY_PLACEHOLDER}: ${source.searchUrlTemplate}`,
    );
  }
}

export function buildSourceUrl(source: Source, query: string): string {
  validateSource(source);
  if (!query.trim()) {
    throw new SourceError('query must be non-empty');
  }
  return source.searchUrlTemplate.replaceAll(
    QUERY_PLACEHOLDER,
    encodeURIComponent(query),
  );
}
