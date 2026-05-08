import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getCachedCategory, type Category } from '@/src/services/anilist';
import { loadFavorites } from '@/src/services/favorites';
import { AnimeDetail } from '@/src/types/anime';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AnimeDetail[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const cats: Category[] = ['top', 'trending', 'hentai'];
        const [favSet, ...caches] = await Promise.all([
          loadFavorites(),
          ...cats.map((c) => getCachedCategory(c)),
        ]);
        if (cancelled) return;
        const byAid = new Map<number, AnimeDetail>();
        for (const cache of caches) {
          if (!cache) continue;
          for (const a of cache) {
            if (!byAid.has(a.aid)) byAid.set(a.aid, a);
          }
        }
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

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.appHeader}>
        <ThemedText style={styles.appTitle}>Favorites</ThemedText>
      </View>
      {!loaded ? (
        <ThemedView style={styles.center}>
          <ThemedText style={styles.note}>Loading favorites…</ThemedText>
        </ThemedView>
      ) : items.length === 0 ? (
        <ThemedView style={styles.center}>
          <ThemedText type="subtitle">No favorites yet</ThemedText>
          <ThemedText style={styles.note}>
            Open an anime from Browse and tap “Add to favorites”.
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.aid)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <FavoriteRow item={item} />}
          ItemSeparatorComponent={() => <ThemedView style={styles.separator} />}
        />
      )}
    </ThemedView>
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
  screen: { flex: 1 },
  appHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  appTitle: { fontSize: 26, fontWeight: '800', letterSpacing: 0.5 },
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
