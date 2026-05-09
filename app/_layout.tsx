import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { AppBackground } from '@/components/app-background';
import { migrateAsyncStorageKeys } from '@/src/services/cache-storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

const TransparentDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    card: 'transparent',
  },
};

export default function RootLayout() {
  useEffect(() => {
    // One-time migration: move any AsyncStorage AniList caches to the
    // file-system cache. Recovers users whose AsyncStorage hit SQLITE_FULL
    // before commit history. Fire-and-forget; no UI gate.
    migrateAsyncStorageKeys('anilist-cache-').catch(() => {
      // Migration failure is non-fatal - the app falls back to a fresh
      // file-system cache and re-fetches when the user opens a category.
    });
  }, []);

  return (
    <ThemeProvider value={TransparentDarkTheme}>
      <View style={{ flex: 1 }}>
        <AppBackground />
        <Stack screenOptions={{ contentStyle: { backgroundColor: 'transparent' } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="anime/[aid]" options={{ title: '' }} />
        </Stack>
      </View>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
