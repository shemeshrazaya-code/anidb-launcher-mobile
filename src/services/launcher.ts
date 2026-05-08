import * as Linking from 'expo-linking';

import { buildSourceUrl, Source } from '@/src/types/source';

export async function launch(source: Source, query: string): Promise<string> {
  const url = buildSourceUrl(source, query);
  await Linking.openURL(url);
  return url;
}
