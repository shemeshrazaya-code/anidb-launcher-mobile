import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { getAnimeById, getCachedAnyCategory } from '@/src/services/anilist';
import { loadFavorites, recordFavoriteSnapshot, toggleFavorite } from '@/src/services/favorites';
import { launch } from '@/src/services/launcher';
import { loadSources } from '@/src/services/sources';
import { AnimeDetail } from '@/src/types/anime';
import { Source } from '@/src/types/source';

export default function AnimeDetailScreen() {
  const { aid: aidParam, item: itemParam } = useLocalSearchParams<{ aid: string; item?: string }>();
  const aid = Number(aidParam);
  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    (async () => {
      const [srcs, favs] = await Promise.all([loadSources(), loadFavorites()]);
      if (cancelled) return;
      setSources(srcs);
      setIsFavorite(favs.has(aid));

      // Fastest path: the opening screen passed the item along. Fall back to
      // the category caches, then to a by-id AniList fetch (live-search
      // results are often in no cache at all).
      let found: AnimeDetail | null = null;
      if (itemParam) {
        try {
          const parsed = JSON.parse(itemParam) as AnimeDetail;
          if (parsed && parsed.aid === aid) found = parsed;
        } catch {
          // fall through to cache/network
        }
      }
      if (!found) found = await getCachedAnyCategory(aid);
      if (!found) {
        try {
          found = await getAnimeById(aid);
        } catch {
          // offline or AniList error — surface the not-found state
        }
      }
      if (cancelled) return;
      if (found) {
        setAnime(found);
        if (favs.has(aid)) recordFavoriteSnapshot(found).catch(() => {});
      } else {
        setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aid, itemParam]);

  const onLaunch = useCallback(
    async (source: Source) => {
      if (!anime) return;
      try {
        await launch(source, anime.title);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert('Could not open URL', msg);
      }
    },
    [anime],
  );

  const onToggleFavorite = useCallback(async () => {
    if (!anime) return;
    const next = await toggleFavorite(anime);
    setIsFavorite(next);
  }, [anime]);

  if (!anime) {
    return (
      <ThemedView style={styles.center}>
        {loadFailed ? (
          <>
            <ThemedText type="subtitle">Anime not found</ThemedText>
            <ThemedText style={styles.note}>
              Not in the local cache and AniList didn&apos;t return it. Check your connection and
              try again.
            </ThemedText>
          </>
        ) : (
          <ActivityIndicator color={Brand.primary} size="large" />
        )}
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ThemedView style={styles.header}>
        {anime.pictureUrl && (
          <Image source={{ uri: anime.pictureUrl }} style={styles.poster} contentFit="cover" />
        )}
        <View style={styles.headerText}>
          <ThemedText type="title" numberOfLines={3}>
            {anime.title}
          </ThemedText>
          <ThemedText style={styles.meta}>
            {[anime.season, anime.type, anime.episodeCount ? `${anime.episodeCount} ep` : null]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
          {anime.rating != null && (
            <ThemedText style={styles.rating}>★ {anime.rating.toFixed(1)}</ThemedText>
          )}
          <Pressable
            onPress={onToggleFavorite}
            style={({ pressed }) => [
              styles.favBtn,
              isFavorite && styles.favBtnActive,
              pressed && styles.favBtnPressed,
            ]}>
            <ThemedText
              type="defaultSemiBold"
              lightColor={isFavorite ? '#fff' : undefined}
              darkColor={isFavorite ? '#fff' : undefined}>
              {isFavorite ? '★ Favorited' : '☆ Add to favorites'}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      {anime.genres && anime.genres.length > 0 && (
        <ThemedView style={styles.genreRow}>
          {anime.genres.slice(0, 8).map((g) => (
            <ThemedView key={g} style={styles.genrePill}>
              <ThemedText style={styles.genreText}>{g}</ThemedText>
            </ThemedView>
          ))}
        </ThemedView>
      )}

      {anime.description ? (
        <ThemedText style={styles.description}>{anime.description}</ThemedText>
      ) : null}

      <ThemedView style={styles.searchSection}>
        <ThemedText type="subtitle">Search on…</ThemedText>
        {sources.length === 0 ? (
          <Pressable onPress={() => router.push('/settings')} style={styles.emptyHint}>
            <ThemedText style={styles.emptyHintText}>
              No sources configured. Tap to set one up in Settings →
            </ThemedText>
          </Pressable>
        ) : (
          sources.map((s) => (
            <Pressable
              key={s.name}
              onPress={() => onLaunch(s)}
              style={({ pressed }) => [styles.sourceBtn, pressed && styles.sourceBtnPressed]}>
              <ThemedText type="defaultSemiBold">{s.name}</ThemedText>
              <ThemedText style={styles.sourceUrl} numberOfLines={1}>
                {s.searchUrlTemplate}
              </ThemedText>
            </Pressable>
          ))
        )}
      </ThemedView>

      {anime.altTitles && anime.altTitles.length > 0 && (
        <ThemedView style={styles.altSection}>
          <ThemedText type="defaultSemiBold">Also known as</ThemedText>
          {anime.altTitles.slice(0, 6).map((t) => (
            <ThemedText key={t} style={styles.altTitle} numberOfLines={1}>
              · {t}
            </ThemedText>
          ))}
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  scroll: { padding: 16, gap: 16, paddingBottom: 48 },
  header: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  poster: { width: 110, height: 158, borderRadius: 8, backgroundColor: '#222' },
  headerText: { flex: 1, gap: 6 },
  meta: { opacity: 0.7, fontSize: 14 },
  rating: { fontSize: 16, opacity: 0.9 },
  favBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(127,127,127,0.15)', alignSelf: 'flex-start' },
  favBtnActive: { backgroundColor: Brand.primary },
  favBtnPressed: { opacity: 0.85 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  genrePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(127,127,127,0.18)' },
  genreText: { fontSize: 12, opacity: 0.85 },
  description: { lineHeight: 20, opacity: 0.9 },
  searchSection: { gap: 8 },
  sourceBtn: { padding: 12, borderRadius: 8, backgroundColor: 'rgba(127,127,127,0.12)', gap: 4 },
  sourceBtnPressed: { opacity: 0.6 },
  sourceUrl: { fontSize: 12, opacity: 0.6 },
  emptyHint: { padding: 16, borderRadius: 8, backgroundColor: 'rgba(127,127,127,0.1)', alignItems: 'center' },
  emptyHintText: { textAlign: 'center', opacity: 0.85 },
  note: { textAlign: 'center', opacity: 0.7 },
  altSection: { gap: 4 },
  altTitle: { opacity: 0.7, fontSize: 13 },
});
