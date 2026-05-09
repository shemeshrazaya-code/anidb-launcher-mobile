import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImportSourcesSheet } from '@/components/import-sources-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAppSettings } from '@/src/services/app-settings';
import { BACKGROUND_PRESETS, useAppBackground } from '@/src/services/background';
import { addSource, loadSources, removeSource, saveSources } from '@/src/services/sources';
import { mergeSources, serializeSources } from '@/src/services/sources-share';
import { normalizeSourceUrlTemplate, previewSourceUrl, Source } from '@/src/types/source';

const REPO_URL = 'https://github.com/shemeshrazaya-code/anidb-launcher-mobile';
const SPONSOR_URL = 'https://github.com/sponsors/shemeshrazaya-code';
const APP_VERSION = Constants.expoConfig?.version ?? '0.1.x';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'muted');
  const { config: bgConfig, setVariant: setBgVariant, setCustomUri: setBgCustomUri, clearCustom: clearBgCustom } = useAppBackground();
  const { settings: appSettings, setHentaiEnabled } = useAppSettings();
  const [sources, setSources] = useState<Source[]>([]);
  const [name, setName] = useState('');
  const [tmpl, setTmpl] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const templatePreview = useMemo(() => {
    if (!tmpl.trim()) return null;
    try {
      const template = normalizeSourceUrlTemplate(tmpl);
      return { template, previewUrl: previewSourceUrl(template), error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { template: null, previewUrl: null, error: msg };
    }
  }, [tmpl]);

  const onExport = useCallback(async () => {
    if (sources.length === 0) {
      Alert.alert('Nothing to share', 'Add at least one source first.');
      return;
    }
    const json = serializeSources(sources);
    try {
      await Share.share({
        message: json,
        title: `Anime DB sources (${sources.length})`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not share', msg);
    }
  }, [sources]);

  const onMergeImport = useCallback(
    async (incoming: Source[]) => {
      const { merged, added, skipped } = mergeSources(sources, incoming);
      await saveSources(merged);
      setSources(merged);
      Alert.alert(
        'Imported',
        `Added ${added} new source${added === 1 ? '' : 's'}` +
          (skipped > 0 ? `, skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}.` : '.'),
      );
    },
    [sources],
  );

  const onReplaceImport = useCallback(async (incoming: Source[]) => {
    await saveSources(incoming);
    setSources(incoming);
    Alert.alert('Replaced', `Installed ${incoming.length} source${incoming.length === 1 ? '' : 's'}.`);
  }, []);

  const onPickBackground = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos permission needed', 'Allow photo access to use a custom background.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await setBgCustomUri(result.assets[0].uri);
    }
  }, [setBgCustomUri]);

  const refresh = useCallback(async () => {
    setSources(await loadSources());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onAdd = useCallback(async () => {
    try {
      const template = normalizeSourceUrlTemplate(tmpl);
      const candidate: Source = { name: name.trim(), searchUrlTemplate: template };
      await addSource(candidate);
      setName('');
      setTmpl('');
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Invalid source', msg);
    }
  }, [name, tmpl, refresh]);

  const onDelete = useCallback(
    (sourceName: string) => {
      Alert.alert(`Delete "${sourceName}"?`, undefined, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeSource(sourceName);
            await refresh();
          },
        },
      ]);
    },
    [refresh],
  );

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}>
      <View style={styles.appHeader}>
        <ThemedText style={styles.appTitle}>Settings</ThemedText>
      </View>
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Search sources</ThemedText>
        <ThemedText style={styles.help}>
          Paste a search results URL. Anime DB will turn the search term into {'{query}'}.
        </ThemedText>
        <View style={styles.shareRow}>
          <Pressable
            onPress={onExport}
            style={({ pressed }) => [styles.shareBtn, pressed && styles.shareBtnPressed]}>
            <ThemedText style={styles.shareBtnText}>Share my list</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setImportOpen(true)}
            style={({ pressed }) => [styles.shareBtn, pressed && styles.shareBtnPressed]}>
            <ThemedText style={styles.shareBtnText}>Import…</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        {sources.length === 0 ? (
          <ThemedText style={styles.empty}>No sources yet — add one below.</ThemedText>
        ) : (
          sources.map((s) => (
            <ThemedView key={s.name} style={styles.sourceRow}>
              <ThemedView style={styles.sourceText}>
                <ThemedText type="defaultSemiBold">{s.name}</ThemedText>
                <ThemedText style={styles.url} numberOfLines={1}>
                  {s.searchUrlTemplate}
                </ThemedText>
              </ThemedView>
              <Pressable onPress={() => onDelete(s.name)} style={styles.deleteBtn}>
                <ThemedText style={styles.deleteText}>Delete</ThemedText>
              </Pressable>
            </ThemedView>
          ))
        )}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold">Add a source</ThemedText>
        <TextInput
          placeholder="Name (e.g. AniList)"
          placeholderTextColor={mutedColor}
          value={name}
          onChangeText={setName}
          style={[
            styles.input,
            { backgroundColor: surfaceColor, borderColor, color: textColor },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          placeholder="https://example.com/search?q=naruto"
          placeholderTextColor={mutedColor}
          value={tmpl}
          onChangeText={setTmpl}
          style={[
            styles.input,
            { backgroundColor: surfaceColor, borderColor, color: textColor },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        {templatePreview ? (
          <View
            style={[
              styles.previewBox,
              templatePreview.error ? styles.previewBoxError : styles.previewBoxReady,
            ]}>
            {templatePreview.error ? (
              <ThemedText style={styles.previewError}>{templatePreview.error}</ThemedText>
            ) : (
              <>
                <ThemedText style={styles.previewLabel}>Preview</ThemedText>
                <ThemedText style={styles.previewUrl} numberOfLines={2}>
                  {templatePreview.previewUrl}
                </ThemedText>
              </>
            )}
          </View>
        ) : null}
        <Pressable onPress={onAdd} style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}>
          <ThemedText type="defaultSemiBold" lightColor="#fff" darkColor="#fff">Add source</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Background</ThemedText>
        <ThemedText style={styles.help}>
          Pick a preset or use one of your photos. Custom photos are dimmed for readability.
        </ThemedText>
        {BACKGROUND_PRESETS.map((p) => {
          const active = bgConfig.variant === p.variant;
          return (
            <Pressable
              key={p.variant}
              onPress={() => setBgVariant(p.variant)}
              style={({ pressed }) => [
                styles.bgRow,
                { backgroundColor: surfaceColor, borderColor },
                active && styles.bgRowActive,
                pressed && styles.bgRowPressed,
              ]}>
              <View style={styles.bgRowText}>
                <ThemedText
                  style={[styles.bgRowName, active && styles.bgRowNameActive]}>
                  {p.name}
                </ThemedText>
                <ThemedText style={styles.bgRowDesc}>{p.description}</ThemedText>
              </View>
              {active ? <ThemedText style={styles.bgCheck}>✓</ThemedText> : null}
            </Pressable>
          );
        })}
        <Pressable
          onPress={onPickBackground}
          style={({ pressed }) => [
            styles.bgRow,
            { backgroundColor: surfaceColor, borderColor },
            bgConfig.variant === 'custom' && styles.bgRowActive,
            pressed && styles.bgRowPressed,
          ]}>
          <View style={styles.bgRowText}>
            <ThemedText
              style={[
                styles.bgRowName,
                bgConfig.variant === 'custom' && styles.bgRowNameActive,
              ]}>
              {bgConfig.variant === 'custom' ? 'Custom photo' : 'Choose photo…'}
            </ThemedText>
            <ThemedText style={styles.bgRowDesc} numberOfLines={1}>
              {bgConfig.variant === 'custom' && bgConfig.customUri
                ? bgConfig.customUri
                : 'Upload from your library'}
            </ThemedText>
          </View>
          {bgConfig.variant === 'custom' ? (
            <ThemedText style={styles.bgCheck}>✓</ThemedText>
          ) : null}
        </Pressable>
        {bgConfig.variant === 'custom' ? (
          <Pressable
            onPress={() => {
              Alert.alert('Remove custom background?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: clearBgCustom },
              ]);
            }}
            style={({ pressed }) => [styles.bgClearBtn, pressed && styles.bgRowPressed]}>
            <ThemedText style={styles.bgClearText}>Remove custom photo</ThemedText>
          </Pressable>
        ) : null}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Content</ThemedText>
        <View style={[styles.toggleRow, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.toggleText}>
            <ThemedText style={styles.toggleLabel}>Show Hentai category</ThemedText>
            <ThemedText style={styles.toggleDesc}>
              Adds (or hides) the Hentai category in the picker. Doesn&apos;t affect search or other categories.
            </ThemedText>
          </View>
          <Switch
            value={appSettings.hentaiEnabled}
            onValueChange={setHentaiEnabled}
            trackColor={{ false: Colors.dark.border, true: Brand.primary }}
            thumbColor="#fff"
          />
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">About</ThemedText>
        <ThemedView style={styles.aboutRow}>
          <ThemedText style={styles.aboutLabel}>Version</ThemedText>
          <ThemedText style={styles.aboutValue}>{APP_VERSION}</ThemedText>
        </ThemedView>
        <Pressable
          onPress={() => Linking.openURL(REPO_URL)}
          style={({ pressed }) => [styles.aboutLink, pressed && styles.aboutLinkPressed]}>
          <ThemedText style={styles.aboutLinkText}>GitHub repo →</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(SPONSOR_URL)}
          style={({ pressed }) => [styles.aboutLink, pressed && styles.aboutLinkPressed]}>
          <ThemedText style={styles.aboutLinkText}>Sponsor on GitHub ♥</ThemedText>
        </Pressable>
        <ThemedText style={styles.help}>
          Free, FOSS, no ads. Sponsorships are optional and appreciated.
        </ThemedText>
      </ThemedView>

      <ImportSourcesSheet
        visible={importOpen}
        existingCount={sources.length}
        onMerge={onMergeImport}
        onReplace={onReplaceImport}
        onClose={() => setImportOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
  appHeader: { paddingBottom: 4 },
  appTitle: { fontSize: 26, fontWeight: '800', letterSpacing: 0.5 },
  section: { gap: 8 },
  help: { opacity: 0.7, fontSize: 13 },
  empty: { opacity: 0.6, fontStyle: 'italic' },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(127,127,127,0.10)',
  },
  sourceText: { flex: 1, gap: 2 },
  url: { fontSize: 12, opacity: 0.6 },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(220,80,80,0.15)',
  },
  deleteText: { color: '#c44', fontWeight: '600', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  previewBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  previewBoxReady: {
    borderColor: 'rgba(139,92,246,0.45)',
    backgroundColor: 'rgba(139,92,246,0.10)',
  },
  previewBoxError: {
    borderColor: 'rgba(220,80,80,0.35)',
    backgroundColor: 'rgba(220,80,80,0.10)',
  },
  previewLabel: { fontSize: 11, opacity: 0.65, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewUrl: { color: Brand.primaryLight, fontSize: 12, lineHeight: 16 },
  previewError: { color: '#e57373', fontSize: 12, lineHeight: 16 },
  addBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Brand.primary,
    alignItems: 'center',
  },
  addBtnPressed: { opacity: 0.85, backgroundColor: Brand.primaryDark },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  aboutLabel: { opacity: 0.7, fontSize: 13 },
  aboutValue: { fontSize: 13, fontWeight: '600' },
  aboutLink: {
    paddingVertical: 8,
  },
  aboutLinkPressed: { opacity: 0.55 },
  aboutLinkText: { fontSize: 14, color: Brand.primaryLight, fontWeight: '500' },
  bgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  bgRowActive: { borderColor: Brand.primary, backgroundColor: 'rgba(139,92,246,0.10)' },
  bgRowPressed: { opacity: 0.7 },
  bgRowText: { flex: 1, gap: 2 },
  bgRowName: { fontSize: 15, fontWeight: '600' },
  bgRowNameActive: { color: Brand.primaryLight },
  bgRowDesc: { fontSize: 12, opacity: 0.6 },
  bgCheck: { color: Brand.primaryLight, fontSize: 18, fontWeight: '700' },
  bgClearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(220,80,80,0.12)',
    alignItems: 'center',
  },
  bgClearText: { color: '#e57373', fontSize: 14, fontWeight: '600' },
  shareRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  shareBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.10)',
    borderWidth: 1,
    borderColor: Brand.primary,
    alignItems: 'center',
  },
  shareBtnPressed: { opacity: 0.7 },
  shareBtnText: { color: Brand.primaryLight, fontSize: 13, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  toggleText: { flex: 1, gap: 4 },
  toggleLabel: { fontSize: 15, fontWeight: '600' },
  toggleDesc: { fontSize: 12, opacity: 0.6, lineHeight: 16 },
});
