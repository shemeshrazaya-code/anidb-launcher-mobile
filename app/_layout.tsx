import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';

import { AppBackground } from '@/components/app-background';

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
