import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getTopAnime } from '@/src/services/anilist';
import { AnimeDetail } from '@/src/types/anime';

export default function BrowseScreen() {
  const [items, setItems] = useState<AnimeDetail[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force: boolean) => {
    setError(null);
    try {
      const data = await getTopAnime({ forceRefresh: force });
      setItems(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  if (items == null && !error) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.note}>Fetching top anime from AniList…</ThemedText>
      </ThemedView>
    );
  }

  if (error && (items == null || items.length === 0)) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="subtitle">Could not load anime</ThemedText>
        <ThemedText style={styles.errorMsg}>{error}</ThemedText>
        <Pressable onPress={() => load(true)} style={styles.retry}>
          <ThemedText type="defaultSemiBold">Retry</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <FlatList
      data={items ?? []}
      keyExtractor={(item) => String(item.aid)}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => <AnimeRow item={item} />}
      ItemSeparatorComponent={() => <ThemedView style={styles.separator} />}
    />
  );
}

function AnimeRow({ item }: { item: AnimeDetail }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/anime/[aid]', params: { aid: String(item.aid) } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {item.pictureUrl ? (
        <Image source={{ uri: item.pictureUrl }} style={styles.poster} contentFit="cover" />
      ) : (
        <ThemedView style={styles.posterFallback} />
      )}
      <ThemedView style={styles.rowText}>
        <ThemedText type="defaultSemiBold" numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={styles.meta} numberOfLines={1}>
          {[item.season, item.type, item.episodeCount ? `${item.episodeCount} ep` : null]
            .filter(Boolean)
            .join(' · ')}
        </ThemedText>
        {item.rating != null && (
          <ThemedText style={styles.rating}>★ {item.rating.toFixed(1)}</ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  note: { opacity: 0.7 },
  errorMsg: { textAlign: 'center', opacity: 0.7 },
  retry: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 16 },
  listContent: { paddingVertical: 8 },
  separator: { height: 1, opacity: 0.08, backgroundColor: '#888' },
  row: { flexDirection: 'row', padding: 12, gap: 12, alignItems: 'center' },
  rowPressed: { opacity: 0.6 },
  poster: { width: 64, height: 92, borderRadius: 6, backgroundColor: '#222' },
  posterFallback: { width: 64, height: 92, borderRadius: 6, backgroundColor: '#333' },
  rowText: { flex: 1, gap: 4 },
  meta: { opacity: 0.7, fontSize: 13 },
  rating: { opacity: 0.85, fontSize: 13 },
});
