import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getCachedTopAnime } from '@/src/services/anilist';
import { loadFavorites } from '@/src/services/favorites';
import { AnimeDetail } from '@/src/types/anime';

export default function FavoritesScreen() {
  const [items, setItems] = useState<AnimeDetail[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [favSet, cached] = await Promise.all([loadFavorites(), getCachedTopAnime()]);
        if (cancelled) return;
        if (!cached) {
          setItems([]);
          setLoaded(true);
          return;
        }
        const byAid = new Map(cached.map((a) => [a.aid, a]));
        const list: AnimeDetail[] = [];
        for (const aid of favSet) {
          const a = byAid.get(aid);
          if (a) list.push(a);
        }
        list.sort((a, b) => a.title.localeCompare(b.title));
        setItems(list);
        setLoaded(true);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (!loaded) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={styles.note}>Loading favorites…</ThemedText>
      </ThemedView>
    );
  }

  if (items.length === 0) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="subtitle">No favorites yet</ThemedText>
        <ThemedText style={styles.note}>
          Open an anime from Browse and tap “Add to favorites”.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.aid)}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => <FavoriteRow item={item} />}
      ItemSeparatorComponent={() => <ThemedView style={styles.separator} />}
    />
  );
}

function FavoriteRow({ item }: { item: AnimeDetail }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/anime/[aid]', params: { aid: String(item.aid) } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {item.pictureUrl && (
        <Image source={{ uri: item.pictureUrl }} style={styles.poster} contentFit="cover" />
      )}
      <ThemedView style={styles.rowText}>
        <ThemedText type="defaultSemiBold" numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={styles.meta} numberOfLines={1}>
          {[item.season, item.type].filter(Boolean).join(' · ')}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  note: { opacity: 0.7, textAlign: 'center' },
  listContent: { paddingVertical: 8 },
  separator: { height: 1, opacity: 0.08, backgroundColor: '#888' },
  row: { flexDirection: 'row', padding: 12, gap: 12, alignItems: 'center' },
  rowPressed: { opacity: 0.6 },
  poster: { width: 56, height: 80, borderRadius: 6, backgroundColor: '#222' },
  rowText: { flex: 1, gap: 4 },
  meta: { opacity: 0.7, fontSize: 13 },
});
