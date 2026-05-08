import AsyncStorage from '@react-native-async-storage/async-storage';

import { Source } from '@/src/types/source';
import { addSource, loadSources, removeSource, saveSources } from '../sources';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('sources storage', () => {
  const a: Source = { name: 'A', searchUrlTemplate: 'https://a/{query}' };
  const b: Source = { name: 'B', searchUrlTemplate: 'https://b/{query}' };

  it('returns the bundled defaults (empty for v0.1.0) when nothing stored', async () => {
    expect(await loadSources()).toEqual([]);
  });

  it('round-trips a saved list', async () => {
    await saveSources([a, b]);
    expect(await loadSources()).toEqual([a, b]);
  });

  it('adds a new source', async () => {
    const after = await addSource(a);
    expect(after).toEqual([a]);
    expect(await loadSources()).toEqual([a]);
  });

  it('rejects duplicate names on add', async () => {
    await addSource(a);
    await expect(addSource({ ...a, searchUrlTemplate: 'https://x/{query}' }))
      .rejects.toThrow(/already exists/);
  });

  it('removes a source by name', async () => {
    await saveSources([a, b]);
    const after = await removeSource('A');
    expect(after).toEqual([b]);
  });

  it('throws when removing a missing name', async () => {
    await saveSources([a]);
    await expect(removeSource('zzz')).rejects.toThrow(/no source named/);
  });
});
