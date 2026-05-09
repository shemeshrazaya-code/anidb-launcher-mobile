import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

const SPONSOR_URL = 'https://github.com/sponsors/shemeshrazaya-code';

import { CategorySheet } from '@/components/category-sheet';
import { GenreFilterSheet } from '@/components/genre-filter-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  CategoryId,
  DEFAULT_CATEGORY,
  FetchProgress,
  getCachedCategory,
  getCategory,
  getCategoryDef,
  searchAnime,
} from '@/src/services/anilist';
import { AnimeDetail } from '@/src/types/anime';

export default function BrowseScreen() {
  const insets = useSafeAreaInsets();
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'muted');
  const [category, setCategory] = useState<CategoryId>(DEFAULT_CATEGORY);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const currentCategoryDef = getCategoryDef(category);
  const [items, setItems] = useState<AnimeDetail[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set());
  const [genreSheetOpen, setGenreSheetOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<AnimeDetail[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const fetchSignal = useRef<{ cancelled: boolean } | null>(null);

  useEffect(() => {
    setActiveGenres(new Set());
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
        const results = await searchAnime(q, { includeAdult: !!currentCategoryDef?.adult });
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
    if (!items) return [];
    const counts = new Map<string, number>();
    for (const a of items) {
      for (const g of a.genres ?? []) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [items]);

  const visible = useMemo(() => {
    if (inSearchMode) return searchResults ?? [];
    if (!items) return [];
    if (activeGenres.size === 0) return items;
    return items.filter((a) => {
      const itemGenres = a.genres ?? [];
      for (const g of itemGenres) {
        if (activeGenres.has(g)) return true;
      }
      return false;
    });
  }, [items, searchResults, inSearchMode, activeGenres]);

  if (items == null && !error && !inSearchMode) {
    return <SkeletonBrowse label={currentCategoryDef?.name ?? category} />;
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.appHeader}>
        <ThemedText style={styles.appTitle}>Anime DB</ThemedText>
      </View>
      <View style={styles.categoryButtonRow}>
        <Pressable
          onPress={() => setCategorySheetOpen(true)}
          style={({ pressed }) => [
            styles.categoryButton,
            { backgroundColor: surfaceColor, borderColor },
            pressed && styles.categoryButtonPressed,
          ]}>
          <View style={styles.categoryButtonText}>
            <ThemedText style={styles.categoryButtonLabel}>Category</ThemedText>
            <ThemedText style={styles.categoryButtonValue} numberOfLines={1}>
              {currentCategoryDef?.name ?? 'Choose…'}
            </ThemedText>
          </View>
          <ThemedText style={styles.categoryButtonChevron}>▾</ThemedText>
        </Pressable>
      </View>
      <CategorySheet
        visible={categorySheetOpen}
        selectedId={category}
        onSelect={setCategory}
        onClose={() => setCategorySheetOpen(false)}
      />
      <ThemedView style={styles.searchBar}>
        <TextInput
          placeholder="Search AniList…"
          placeholderTextColor={mutedColor}
          value={filter}
          onChangeText={setFilter}
          style={[
            styles.searchInput,
            { backgroundColor: surfaceColor, borderColor, color: textColor },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <Pressable
          onPress={onRefresh}
          disabled={refreshing || (progress != null)}
          style={({ pressed }) => [
            styles.refreshBtn,
            { backgroundColor: surfaceColor, borderColor },
            pressed && styles.refreshBtnPressed,
            (refreshing || progress != null) && styles.refreshBtnDisabled,
          ]}>
          <ThemedText
            style={[
              styles.refreshBtnText,
              (refreshing || progress != null) && styles.refreshBtnTextActive,
            ]}>
            ↻
          </ThemedText>
        </Pressable>
      </ThemedView>
      {!inSearchMode && (
        <View style={styles.genreButtonRow}>
          <Pressable
            onPress={() => setGenreSheetOpen(true)}
            style={({ pressed }) => [
              styles.genreButton,
              { backgroundColor: surfaceColor, borderColor },
              activeGenres.size > 0 && styles.genreButtonActive,
              pressed && styles.genreButtonPressed,
            ]}>
            <ThemedText style={styles.genreButtonLabel}>Genres</ThemedText>
            <ThemedText
              style={[
                styles.genreButtonValue,
                activeGenres.size === 0 && styles.genreButtonValueAll,
              ]}
              numberOfLines={1}>
              {activeGenres.size === 0
                ? 'All'
                : activeGenres.size === 1
                  ? Array.from(activeGenres)[0]
                  : `${activeGenres.size} selected`}
            </ThemedText>
            {activeGenres.size > 0 ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  setActiveGenres(new Set());
                }}
                hitSlop={8}
                style={styles.genreClearInline}>
                <ThemedText style={styles.genreClearInlineText}>×</ThemedText>
              </Pressable>
            ) : (
              <ThemedText style={styles.genreButtonChevron}>▾</ThemedText>
            )}
          </Pressable>
        </View>
      )}
      <GenreFilterSheet
        visible={genreSheetOpen}
        available={genres}
        selected={activeGenres}
        onChange={setActiveGenres}
        onClose={() => setGenreSheetOpen(false)}
      />
      {progress && !inSearchMode ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, (progress.pageDone / progress.totalPages) * 100)}%` },
            ]}
          />
        </View>
      ) : (
        <View style={styles.progressTrackEmpty} />
      )}
      <ThemedView style={styles.statusRow}>
        {searching ? (
          <ThemedText style={styles.resultCount}>Searching…</ThemedText>
        ) : progress && !inSearchMode ? (
          <ThemedText style={styles.resultCount}>
            Loading {progress.phase} · {progress.itemCount} entries
          </ThemedText>
        ) : (
          <ThemedText style={styles.resultCount}>
            {visible.length} {visible.length === 1 ? 'result' : 'results'}
            {inSearchMode
              ? ` for "${filter.trim()}"`
              : activeGenres.size === 1
                ? ` · ${Array.from(activeGenres)[0]}`
                : activeGenres.size > 1
                  ? ` · ${activeGenres.size} genres`
                  : ''}
          </ThemedText>
        )}
      </ThemedView>
      {error && !inSearchMode ? (
        <Pressable onPress={onRefresh} style={styles.errorBanner}>
          <ThemedText style={styles.errorText}>{error} — tap to retry</ThemedText>
        </Pressable>
      ) : null}
      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.aid)}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.gridRow}
        numColumns={2}
        renderItem={({ item }) => <AnimeCard item={item} />}
        ListEmptyComponent={
          searching ? null : (
            <ThemedView style={styles.empty}>
              <ThemedText style={styles.note}>No matches.</ThemedText>
            </ThemedView>
          )
        }
        ListFooterComponent={
          visible.length > 0 ? (
            <Pressable
              onPress={() => Linking.openURL(SPONSOR_URL)}
              style={({ pressed }) => [styles.sponsorFooter, pressed && styles.sponsorFooterPressed]}>
              <ThemedText style={styles.sponsorFooterText}>
                Like this? Sponsor on GitHub ♥
              </ThemedText>
            </Pressable>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
      />
    </ThemedView>
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
      <View style={styles.posterWrap}>
        {item.pictureUrl ? (
          <Image source={{ uri: item.pictureUrl }} style={styles.cardPoster} contentFit="cover" />
        ) : (
          <View style={styles.cardPosterFallback} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.92)']}
          locations={[0.45, 1]}
          style={styles.posterGradient}
          pointerEvents="none"
        />
        {item.rating != null && (
          <View style={styles.ratingBadge}>
            <ThemedText style={styles.ratingBadgeText}>★ {item.rating.toFixed(1)}</ThemedText>
          </View>
        )}
        <View style={styles.cardOverlay} pointerEvents="none">
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={2}
            lightColor="#fff"
            darkColor="#fff"
            style={styles.cardTitle}>
            {item.title}
          </ThemedText>
          {year && (
            <ThemedText lightColor="#fff" darkColor="#fff" style={styles.cardYear}>
              {year}
            </ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function SkeletonBrowse({ label }: { label: string }) {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.progressTrackEmpty} />
      <ThemedView style={styles.statusRow}>
        <ThemedText style={styles.resultCount}>Loading {label}…</ThemedText>
      </ThemedView>
      <View style={styles.skeletonGrid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    </ThemedView>
  );
}

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 850, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 850, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonPoster} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  note: { opacity: 0.7 },
  appHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  categoryButtonRow: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  categoryButtonPressed: { opacity: 0.85 },
  categoryButtonText: { flex: 1, gap: 1 },
  categoryButtonLabel: { fontSize: 11, opacity: 0.55, textTransform: 'uppercase', letterSpacing: 0.6 },
  categoryButtonValue: { fontSize: 15, fontWeight: '700', color: Brand.primaryLight },
  categoryButtonChevron: { fontSize: 16, opacity: 0.6 },
  searchBar: { paddingHorizontal: 12, paddingTop: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnPressed: { opacity: 0.6 },
  refreshBtnDisabled: { opacity: 0.4 },
  refreshBtnText: { fontSize: 18, fontWeight: '600' },
  refreshBtnTextActive: { color: Brand.primaryLight },
  genreButtonRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  genreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  genreButtonActive: { borderColor: Brand.primary },
  genreButtonPressed: { opacity: 0.85 },
  genreButtonLabel: { fontSize: 12, opacity: 0.55, textTransform: 'uppercase', letterSpacing: 0.5 },
  genreButtonValue: { fontSize: 14, fontWeight: '600', flex: 1, color: Brand.primaryLight },
  genreButtonValueAll: { color: Colors.dark.text, opacity: 0.7, fontWeight: '500' },
  genreButtonChevron: { fontSize: 14, opacity: 0.55 },
  genreClearInline: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  genreClearInlineText: { fontSize: 16, lineHeight: 18, fontWeight: '700' },
  progressTrack: {
    height: 2,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(139,92,246,0.15)',
    overflow: 'hidden',
  },
  progressTrackEmpty: { height: 2, marginHorizontal: 12, marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: Brand.primary, borderRadius: 999 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 6 },
  resultCount: { fontSize: 12, opacity: 0.55 },
  errorBanner: { marginHorizontal: 12, padding: 10, borderRadius: 8, backgroundColor: 'rgba(220,80,80,0.15)' },
  errorText: { color: '#e57373', fontSize: 13 },
  listContent: { paddingHorizontal: 8, paddingBottom: 16 },
  gridRow: { gap: 8, paddingHorizontal: 4 },
  card: { flex: 1, marginBottom: 12 },
  cardPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  posterWrap: { position: 'relative', borderRadius: 10, overflow: 'hidden' },
  cardPoster: { width: '100%', aspectRatio: 2 / 3, backgroundColor: '#1a1a1c' },
  cardPosterFallback: { width: '100%', aspectRatio: 2 / 3, backgroundColor: '#1a1a1c' },
  posterGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 },
  ratingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  ratingBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardOverlay: { position: 'absolute', left: 8, right: 8, bottom: 8 },
  cardTitle: { fontSize: 13, lineHeight: 16, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  cardYear: { fontSize: 11, opacity: 0.85, marginTop: 2 },
  empty: { padding: 32, alignItems: 'center', flex: 1 },
  sponsorFooter: {
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  sponsorFooterPressed: { opacity: 0.5 },
  sponsorFooterText: { fontSize: 12, opacity: 0.45 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  skeletonCard: { width: '50%', padding: 4 },
  skeletonPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
});
