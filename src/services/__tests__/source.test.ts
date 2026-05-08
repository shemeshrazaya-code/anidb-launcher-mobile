import {
  buildSourceUrl,
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
});
