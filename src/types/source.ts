export const QUERY_PLACEHOLDER = '{query}';
const PREVIEW_QUERY = 'Attack on Titan';
const SEARCH_PARAM_NAMES = new Set([
  'q',
  'query',
  'search',
  'keyword',
  'keywords',
  'term',
  'text',
  's',
]);

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

function withHttpScheme(input: string): string {
  const trimmed = input.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

function decodePlaceholder(url: URL): string {
  return url.toString().replace(/%7Bquery%7D/gi, QUERY_PLACEHOLDER);
}

function inferTemplateFromUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(withHttpScheme(input));
  } catch {
    throw new SourceError('paste a search results URL or a template containing {query}');
  }

  const params = Array.from(url.searchParams.entries());
  const preferred = params.find(
    ([name, value]) => SEARCH_PARAM_NAMES.has(name.toLowerCase()) && value.trim(),
  );
  const fallback = [...params].reverse().find(([, value]) => value.trim());
  const queryParam = preferred ?? fallback;

  if (queryParam) {
    url.searchParams.set(queryParam[0], QUERY_PLACEHOLDER);
    return decodePlaceholder(url);
  }

  const pathParts = url.pathname.split('/');
  let lastPathPart = -1;
  for (let i = pathParts.length - 1; i >= 0; i -= 1) {
    if (pathParts[i].trim().length > 0) {
      lastPathPart = i;
      break;
    }
  }
  if (lastPathPart >= 0) {
    pathParts[lastPathPart] = QUERY_PLACEHOLDER;
    url.pathname = pathParts.join('/');
    return decodePlaceholder(url);
  }

  throw new SourceError('paste a search results URL with a search term in it');
}

export function normalizeSourceUrlTemplate(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new SourceError('search URL must be non-empty');

  const template = trimmed.includes(QUERY_PLACEHOLDER)
    ? withHttpScheme(trimmed)
    : inferTemplateFromUrl(trimmed);

  validateSourceUrlTemplate(template);
  return template;
}

function validateSourceUrlTemplate(template: string): void {
  if (!template.includes(QUERY_PLACEHOLDER)) {
    throw new SourceError(`search URL template must contain ${QUERY_PLACEHOLDER}: ${template}`);
  }

  try {
    const previewUrl = new URL(template.replaceAll(QUERY_PLACEHOLDER, PREVIEW_QUERY));
    if (previewUrl.protocol !== 'http:' && previewUrl.protocol !== 'https:') {
      throw new SourceError('search URL must start with http:// or https://');
    }
  } catch (e) {
    if (e instanceof SourceError) throw e;
    throw new SourceError('search URL must be a valid web URL');
  }
}

export function validateSource(source: Source): void {
  if (!source.name.trim()) {
    throw new SourceError('source name must be non-empty');
  }
  validateSourceUrlTemplate(source.searchUrlTemplate);
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

export function previewSourceUrl(template: string): string {
  return buildSourceUrl({ name: 'Preview', searchUrlTemplate: template }, PREVIEW_QUERY);
}
