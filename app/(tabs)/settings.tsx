import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { addSource, loadSources, removeSource } from '@/src/services/sources';
import { Source, validateSource } from '@/src/types/source';

export default function SettingsScreen() {
  const [sources, setSources] = useState<Source[]>([]);
  const [name, setName] = useState('');
  const [tmpl, setTmpl] = useState('');

  const refresh = useCallback(async () => {
    setSources(await loadSources());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onAdd = useCallback(async () => {
    const candidate: Source = { name: name.trim(), searchUrlTemplate: tmpl.trim() };
    try {
      validateSource(candidate);
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
    <ScrollView contentContainerStyle={styles.scroll}>
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Search sources</ThemedText>
        <ThemedText style={styles.help}>
          Bring your own search URLs. Use {'{query}'} where the title goes.
        </ThemedText>
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
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          placeholder="https://example.com/search?q={query}"
          placeholderTextColor="#888"
          value={tmpl}
          onChangeText={setTmpl}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Pressable onPress={onAdd} style={styles.addBtn}>
          <ThemedText type="defaultSemiBold">Add</ThemedText>
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
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
    borderColor: 'rgba(127,127,127,0.3)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#fff',
  },
  addBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: 'rgba(80,140,220,0.2)',
    alignItems: 'center',
  },
});
