import {
  buildSourceUrl,
  normalizeSourceUrlTemplate,
  previewSourceUrl,
  QUERY_PLACEHOLDER,
  Source,
  SourceError,
  validateSource,
} from '@/src/types/source';

describe('source URL building', () => {
  const animeplanet: Source = {
    name: 'AnimePlanet',
    searchUrlTemplate: 'https://www.anime-planet.com/anime/all?name={query}',
  };

  it('substitutes the query and percent-encodes', () => {
    expect(buildSourceUrl(animeplanet, 'Cowboy Bebop')).toBe(
      'https://www.anime-planet.com/anime/all?name=Cowboy%20Bebop',
    );
  });

  it('encodes ampersands and reserved chars', () => {
    expect(buildSourceUrl(animeplanet, 'Fist & Punch')).toBe(
      'https://www.anime-planet.com/anime/all?name=Fist%20%26%20Punch',
    );
  });

  it('replaces every {query} occurrence', () => {
    const dual: Source = {
      name: 'dual',
      searchUrlTemplate: 'https://x/{query}/y/{query}',
    };
    expect(buildSourceUrl(dual, 'foo')).toBe('https://x/foo/y/foo');
  });

  it('rejects empty queries', () => {
    expect(() => buildSourceUrl(animeplanet, '   ')).toThrow(SourceError);
  });

  it('rejects sources without the placeholder', () => {
    const bad: Source = {
      name: 'bad',
      searchUrlTemplate: 'https://x/static',
    };
    expect(() => validateSource(bad)).toThrow(SourceError);
    expect(() => validateSource(bad)).toThrow(QUERY_PLACEHOLDER);
  });

  it('rejects empty source names', () => {
    expect(() =>
      validateSource({ name: '   ', searchUrlTemplate: 'https://x/{query}' }),
    ).toThrow(/non-empty/);
  });

  it('normalizes templates without a scheme', () => {
    expect(normalizeSourceUrlTemplate('example.com/search?q={query}')).toBe(
      'https://example.com/search?q={query}',
    );
  });

  it('infers the placeholder from a pasted search URL query parameter', () => {
    expect(normalizeSourceUrlTemplate('https://example.com/search?q=naruto&page=1')).toBe(
      'https://example.com/search?q={query}&page=1',
    );
  });

  it('infers the placeholder from common non-q search parameters', () => {
    expect(normalizeSourceUrlTemplate('anime.example/find?keyword=naruto')).toBe(
      'https://anime.example/find?keyword={query}',
    );
  });

  it('falls back to the last populated query parameter', () => {
    expect(normalizeSourceUrlTemplate('example.com/search?category=anime&name=naruto')).toBe(
      'https://example.com/search?category=anime&name={query}',
    );
  });

  it('infers the placeholder from the last path segment when no query parameter exists', () => {
    expect(normalizeSourceUrlTemplate('https://example.com/search/naruto')).toBe(
      'https://example.com/search/{query}',
    );
  });

  it('rejects non-web schemes', () => {
    expect(() => normalizeSourceUrlTemplate('javascript://example.com/search?q={query}'))
      .toThrow(/http/);
  });

  it('builds a preview URL for the normalized template', () => {
    const template = normalizeSourceUrlTemplate('example.com/search?q=naruto');
    expect(previewSourceUrl(template)).toBe(
      'https://example.com/search?q=Attack%20on%20Titan',
    );
  });
});
