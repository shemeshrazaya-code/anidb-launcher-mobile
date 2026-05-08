import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  Category,
  FetchProgress,
  getCachedCategory,
  getCategory,
  searchAnime,
} from '@/src/services/anilist';
import { AnimeDetail } from '@/src/types/anime';

const CATEGORY_LABELS: Record<Category, string> = {
  top: 'Top',
  trending: 'Trending',
  hentai: 'Hentai',
};

export default function BrowseScreen() {
  const [category, setCategory] = useState<Category>('top');
  const [items, setItems] = useState<AnimeDetail[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<AnimeDetail[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const fetchSignal = useRef<{ cancelled: boolean } | null>(null);

  useEffect(() => {
    setActiveGenre(null);
    setItems(null);
    setError(null);
    setProgress(null);
    if (fetchSignal.current) fetchSignal.current.cancelled = true;
    const signal = { cancelled: false };
    fetchSignal.current = signal;

    (async () => {
      const cached = await getCachedCategory(category);
      if (signal.cancelled) return;
      if (cached && cached.length > 0) setItems(cached);

      try {
        const fresh = await getCategory(category, {
          onProgress: (p) => {
            if (signal.cancelled) return;
            setProgress(p);
            setItems(p.items);
          },
          signal,
        });
        if (signal.cancelled) return;
        setItems(fresh);
        setProgress(null);
      } catch (e: unknown) {
        if (signal.cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setProgress(null);
      }
    })();

    return () => {
      signal.cancelled = true;
    };
  }, [category]);

  useEffect(() => {
    const q = filter.trim();
    if (!q) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAnime(q, { includeAdult: category === 'hentai' });
        if (seq === searchSeq.current) {
          setSearchResults(results);
          setSearching(false);
        }
      } catch (e) {
        if (seq === searchSeq.current) {
          setSearchResults([]);
          setSearching(false);
        }
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [filter, category]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    if (fetchSignal.current) fetchSignal.current.cancelled = true;
    const signal = { cancelled: false };
    fetchSignal.current = signal;
    try {
      const fresh = await getCategory(category, {
        forceRefresh: true,
        onProgress: (p) => {
          if (signal.cancelled) return;
          setProgress(p);
          setItems(p.items);
        },
        signal,
      });
      if (!signal.cancelled) {
        setItems(fresh);
        setProgress(null);
      }
    } catch (e) {
      if (!signal.cancelled) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setProgress(null);
      }
    } finally {
      setRefreshing(false);
    }
  }, [category]);

  const inSearchMode = filter.trim().length > 0;

  const genres = useMemo(() => {
    if (!items || inSearchMode) return [];
    const counts = new Map<string, number>();
    for (const a of items) {
      for (const g of a.genres ?? []) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name]) => name);
  }, [items, inSearchMode]);

  const visible = useMemo(() => {
    if (inSearchMode) return searchResults ?? [];
    if (!items) return [];
    return activeGenre
      ? items.filter((a) => (a.genres ?? []).includes(activeGenre))
      : items;
  }, [items, searchResults, inSearchMode, activeGenre]);

  if (items == null && !error && !inSearchMode) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.note}>Loading {CATEGORY_LABELS[category]}…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryRow}
        contentContainerStyle={styles.categoryRowContent}>
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={({ pressed }) => [
              styles.categoryPill,
              category === c && styles.categoryPillActive,
              pressed && styles.chipPressed,
            ]}>
            <ThemedText
              style={[
                styles.categoryPillText,
                category === c && styles.categoryPillTextActive,
              ]}>
              {CATEGORY_LABELS[c]}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
      <ThemedView style={styles.searchBar}>
        <TextInput
          placeholder="Search AniList…"
          placeholderTextColor="#888"
          value={filter}
          onChangeText={setFilter}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </ThemedView>
      {!inSearchMode && genres.length > 0 && (
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
      <ThemedView style={styles.statusRow}>
        {searching ? (
          <ThemedText style={styles.resultCount}>Searching…</ThemedText>
        ) : progress && !inSearchMode ? (
          <ThemedText style={styles.resultCount}>
            Loading {progress.phase} · page {progress.pageDone}/{progress.totalPages} ·{' '}
            {progress.itemCount} entries
          </ThemedText>
        ) : (
          <ThemedText style={styles.resultCount}>
            {visible.length} {visible.length === 1 ? 'result' : 'results'}
            {inSearchMode ? ` for "${filter.trim()}"` : activeGenre ? ` · ${activeGenre}` : ''}
          </ThemedText>
        )}
      </ThemedView>
      {error && !inSearchMode ? (
        <Pressable onPress={() => load(category, true)} style={styles.errorBanner}>
          <ThemedText style={styles.errorText}>{error} — tap to retry</ThemedText>
        </Pressable>
      ) : null}
      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.aid)}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.gridRow}
        numColumns={2}
        refreshControl={
          inSearchMode ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          )
        }
        renderItem={({ item }) => <AnimeCard item={item} />}
        ListEmptyComponent={
          searching ? null : (
            <ThemedView style={styles.empty}>
              <ThemedText style={styles.note}>No matches.</ThemedText>
            </ThemedView>
          )
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
  categoryRow: { maxHeight: 48, marginTop: 8 },
  categoryRowContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.15)',
  },
  categoryPillActive: { backgroundColor: 'rgba(80,140,220,0.85)' },
  categoryPillText: { fontSize: 14, opacity: 0.85, fontWeight: '600' },
  categoryPillTextActive: { color: '#fff', opacity: 1 },
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
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  resultCount: { fontSize: 12, opacity: 0.6 },
  errorBanner: { marginHorizontal: 12, padding: 10, borderRadius: 6, backgroundColor: 'rgba(220,80,80,0.15)' },
  errorText: { color: '#c44', fontSize: 13 },
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
