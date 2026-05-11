import * as Linking from 'expo-linking';
import { NativeModules, Platform } from 'react-native';

import { buildSourceUrl, Source } from '@/src/types/source';

type ShieldedBrowserModule = {
  openUrl: (url: string) => Promise<void>;
};

const ShieldedBrowser = NativeModules.ShieldedBrowser as ShieldedBrowserModule | undefined;

export async function launch(source: Source, query: string): Promise<string> {
  const url = buildSourceUrl(source, query);
  if (Platform.OS === 'android' && ShieldedBrowser?.openUrl) {
    await ShieldedBrowser.openUrl(url);
  } else {
    await Linking.openURL(url);
  }
  return url;
}
