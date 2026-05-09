import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, Colors } from '@/constants/theme';
import { parseSources, SourcesParseError } from '@/src/services/sources-share';
import { Source } from '@/src/types/source';

interface Props {
  visible: boolean;
  existingCount: number;
  onMerge: (incoming: Source[]) => Promise<void> | void;
  onReplace: (incoming: Source[]) => Promise<void> | void;
  onClose: () => void;
}

export function ImportSourcesSheet({
  visible,
  existingCount,
  onMerge,
  onReplace,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setText('');
      setError(null);
    }
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 160,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const parsed = useMemo<Source[] | null>(() => {
    if (!text.trim()) return null;
    try {
      const result = parseSources(text);
      setError(null);
      return result;
    } catch (e) {
      setError(e instanceof SourcesParseError ? e.message : String(e));
      return null;
    }
  }, [text]);

  const onPaste = async () => {
    const c = await Clipboard.getStringAsync();
    if (c) setText(c);
  };

  const confirmReplace = () => {
    if (!parsed) return;
    Alert.alert(
      'Replace all sources?',
      `This deletes your current ${existingCount} source${existingCount === 1 ? '' : 's'} and installs ${parsed.length} from the bundle.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: async () => {
            await onReplace(parsed);
            onClose();
          },
        },
      ],
    );
  };

  const doMerge = async () => {
    if (!parsed) return;
    await onMerge(parsed);
    onClose();
  };

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });
  const backdropOpacity = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16), transform: [{ translateY }] },
          ]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <ThemedText style={styles.title}>Import sources</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <ThemedText style={styles.headerClose}>Cancel</ThemedText>
            </Pressable>
          </View>
          <ThemedText style={styles.subtitle}>
            Paste a sources bundle a friend shared with you. JSON only.
          </ThemedText>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.pasteRow}>
              <Pressable
                onPress={onPaste}
                style={({ pressed }) => [styles.pasteBtn, pressed && styles.pasteBtnPressed]}>
                <ThemedText style={styles.pasteBtnText}>Paste from clipboard</ThemedText>
              </Pressable>
            </View>
            <TextInput
              placeholder='{"format":"anime-db-sources/v1", ...}'
              placeholderTextColor={Colors.dark.muted}
              value={text}
              onChangeText={setText}
              style={styles.input}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              textAlignVertical="top"
            />
            {error ? (
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            ) : parsed ? (
              <View style={styles.previewBox}>
                <ThemedText style={styles.previewHead}>
                  {parsed.length} valid source{parsed.length === 1 ? '' : 's'} ready to import
                </ThemedText>
                {parsed.slice(0, 5).map((s) => (
                  <ThemedText key={s.name} style={styles.previewItem} numberOfLines={1}>
                    · {s.name}
                  </ThemedText>
                ))}
                {parsed.length > 5 ? (
                  <ThemedText style={styles.previewItem}>
                    · …and {parsed.length - 5} more
                  </ThemedText>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
          <View style={styles.footer}>
            <Pressable
              onPress={confirmReplace}
              disabled={!parsed}
              style={({ pressed }) => [
                styles.replaceBtn,
                !parsed && styles.btnDisabled,
                pressed && styles.btnPressed,
              ]}>
              <ThemedText style={styles.replaceBtnText}>Replace all</ThemedText>
            </Pressable>
            <Pressable
              onPress={doMerge}
              disabled={!parsed}
              style={({ pressed }) => [
                styles.mergeBtn,
                !parsed && styles.btnDisabled,
                pressed && styles.mergeBtnPressed,
              ]}>
              <ThemedText style={styles.mergeBtnText}>
                {parsed ? `Merge (${parsed.length})` : 'Merge'}
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  sheet: {
    backgroundColor: '#16161b',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '88%',
    minHeight: 420,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  title: { fontSize: 17, fontWeight: '700' },
  headerClose: { color: Colors.dark.muted, fontSize: 15 },
  subtitle: { paddingHorizontal: 18, fontSize: 12, opacity: 0.55, paddingBottom: 12 },
  body: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  pasteRow: { flexDirection: 'row' },
  pasteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: Brand.primary,
  },
  pasteBtnPressed: { opacity: 0.7 },
  pasteBtnText: { color: Brand.primaryLight, fontSize: 13, fontWeight: '600' },
  input: {
    minHeight: 140,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: Colors.dark.text,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  errorText: { color: '#e57373', fontSize: 13 },
  previewBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.10)',
    borderWidth: 1,
    borderColor: Brand.primary,
    gap: 4,
  },
  previewHead: { color: Brand.primaryLight, fontWeight: '700', fontSize: 13, marginBottom: 4 },
  previewItem: { fontSize: 12, opacity: 0.8 },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  replaceBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(220,80,80,0.14)',
  },
  replaceBtnText: { color: '#e57373', fontSize: 14, fontWeight: '700' },
  mergeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Brand.primary,
    alignItems: 'center',
  },
  mergeBtnPressed: { opacity: 0.85, backgroundColor: Brand.primaryDark },
  mergeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.4 },
  btnPressed: { opacity: 0.7 },
});
