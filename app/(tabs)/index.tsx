import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getTopAnime } from '@/src/services/anilist';
import { AnimeDetail } from '@/src/types/anime';

export default function BrowseScreen() {
  const [items, setItems] = useState<AnimeDetail[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

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

  const genres = useMemo(() => {
    if (!items) return [];
    const counts = new Map<string, number>();
    for (const a of items) {
      for (const g of a.genres ?? []) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name]) => name);
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = filter.trim().toLowerCase();
    return items.filter((a) => {
      if (activeGenre && !(a.genres ?? []).includes(activeGenre)) return false;
      if (!q) return true;
      if (a.title.toLowerCase().includes(q)) return true;
      return (a.altTitles ?? []).some((t) => t.toLowerCase().includes(q));
    });
  }, [items, filter, activeGenre]);

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
    <ThemedView style={styles.container}>
      <ThemedView style={styles.searchBar}>
        <TextInput
          placeholder="Filter by title…"
          placeholderTextColor="#888"
          value={filter}
          onChangeText={setFilter}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </ThemedView>
      {genres.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.genreScroll}
          contentContainerStyle={styles.genreScrollContent}>
          <GenreChip
            label="All"
            active={activeGenre == null}
            onPress={() => setActiveGenre(null)}
          />
          {genres.map((g) => (
            <GenreChip
              key={g}
              label={g}
              active={activeGenre === g}
              onPress={() => setActiveGenre(activeGenre === g ? null : g)}
            />
          ))}
        </ScrollView>
      )}
      <ThemedText style={styles.resultCount}>
        {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
        {activeGenre ? ` · ${activeGenre}` : ''}
      </ThemedText>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.aid)}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.gridRow}
        numColumns={2}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => <AnimeCard item={item} />}
        ListEmptyComponent={
          <ThemedView style={styles.empty}>
            <ThemedText style={styles.note}>No matches.</ThemedText>
          </ThemedView>
        }
        keyboardShouldPersistTaps="handled"
      />
    </ThemedView>
  );
}

function GenreChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}>
      <ThemedText style={[styles.chipText, active && styles.chipTextActive]}>{label}</ThemedText>
    </Pressable>
  );
}

function yearOf(item: AnimeDetail): string | null {
  if (item.startDate) {
    const m = item.startDate.match(/^(\d{4})/);
    if (m) return m[1];
  }
  if (item.season) {
    const m = item.season.match(/(\d{4})/);
    if (m) return m[1];
  }
  return null;
}

function AnimeCard({ item }: { item: AnimeDetail }) {
  const year = yearOf(item);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/anime/[aid]', params: { aid: String(item.aid) } })}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <ThemedView style={styles.posterWrap}>
        {item.pictureUrl ? (
          <Image source={{ uri: item.pictureUrl }} style={styles.cardPoster} contentFit="cover" />
        ) : (
          <ThemedView style={styles.cardPosterFallback} />
        )}
        {item.rating != null && (
          <ThemedView style={styles.ratingBadge}>
            <ThemedText style={styles.ratingBadgeText}>★ {item.rating.toFixed(1)}</ThemedText>
          </ThemedView>
        )}
      </ThemedView>
      <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.cardTitle}>
        {item.title}
      </ThemedText>
      {year && <ThemedText style={styles.cardYear}>{year}</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  note: { opacity: 0.7 },
  errorMsg: { textAlign: 'center', opacity: 0.7 },
  retry: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 16 },
  searchBar: { paddingHorizontal: 12, paddingTop: 8 },
  searchInput: {
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#fff',
  },
  genreScroll: { maxHeight: 44, marginTop: 8 },
  genreScrollContent: { paddingHorizontal: 12, gap: 6, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.15)',
  },
  chipActive: { backgroundColor: 'rgba(80,140,220,0.6)' },
  chipPressed: { opacity: 0.6 },
  chipText: { fontSize: 13, opacity: 0.85 },
  chipTextActive: { color: '#fff', opacity: 1 },
  resultCount: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, fontSize: 12, opacity: 0.6 },
  listContent: { paddingHorizontal: 8, paddingBottom: 16 },
  gridRow: { gap: 8, paddingHorizontal: 4 },
  card: { flex: 1, marginBottom: 12, gap: 4 },
  cardPressed: { opacity: 0.7 },
  posterWrap: { position: 'relative' },
  cardPoster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 8, backgroundColor: '#222' },
  cardPosterFallback: { width: '100%', aspectRatio: 2 / 3, borderRadius: 8, backgroundColor: '#333' },
  ratingBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  ratingBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 13, lineHeight: 17 },
  cardYear: { fontSize: 11, opacity: 0.6 },
  empty: { padding: 32, alignItems: 'center', flex: 1 },
});
