import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">anidb-launcher</ThemedText>
      <ThemedText type="subtitle">mobile · phase 1</ThemedText>
      <ThemedText style={styles.note}>
        Scaffold boots. Browse / Favorites / Reminders / Settings tabs land in later phases.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  note: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
