import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getCachedTopAnime } from '@/src/services/anilist';
import { toggleFavorite, loadFavorites } from '@/src/services/favorites';
import { launch } from '@/src/services/launcher';
import { loadSources } from '@/src/services/sources';
import { AnimeDetail } from '@/src/types/anime';
import { Source } from '@/src/types/source';

export default function AnimeDetailScreen() {
  const { aid: aidParam } = useLocalSearchParams<{ aid: string }>();
  const aid = Number(aidParam);
  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    (async () => {
      const [cached, srcs, favs] = await Promise.all([
        getCachedTopAnime(),
        loadSources(),
        loadFavorites(),
      ]);
      const found = cached?.find((a) => a.aid === aid) ?? null;
      setAnime(found);
      setSources(srcs);
      setIsFavorite(favs.has(aid));
    })();
  }, [aid]);

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
    const next = await toggleFavorite(aid);
    setIsFavorite(next);
  }, [aid]);

  if (!anime) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="subtitle">Anime not found in cache</ThemedText>
        <ThemedText style={styles.note}>
          Pull-to-refresh on Browse to repopulate.
        </ThemedText>
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
          <Pressable onPress={onToggleFavorite} style={styles.favBtn}>
            <ThemedText type="defaultSemiBold">
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
  favBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: 'rgba(127,127,127,0.15)', alignSelf: 'flex-start' },
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
