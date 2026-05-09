import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, Colors } from '@/constants/theme';

interface Props {
  visible: boolean;
  available: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  onClose: () => void;
}

export function GenreFilterSheet({ visible, available, selected, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Set<string>>(new Set(selected));
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) setDraft(new Set(selected));
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 160,
      useNativeDriver: true,
    }).start();
  }, [visible, selected, slide]);

  const toggle = (g: string) => {
    const next = new Set(draft);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    setDraft(next);
  };

  const clearAll = () => setDraft(new Set());
  const apply = () => {
    onChange(draft);
    onClose();
  };

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });
  const backdropOpacity = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });
  const draftCount = draft.size;

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
            <ThemedText style={styles.title}>Genres</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <ThemedText style={styles.headerClose}>Cancel</ThemedText>
            </Pressable>
          </View>
          <ThemedText style={styles.subtitle}>
            {draftCount === 0
              ? 'Tap genres to filter — match any selected'
              : `${draftCount} selected · match any`}
          </ThemedText>
          <ScrollView contentContainerStyle={styles.chipsWrap}>
            {available.length === 0 ? (
              <ThemedText style={styles.empty}>
                No genres available yet — try refreshing or pick a different category.
              </ThemedText>
            ) : (
              available.map((g) => {
                const active = draft.has(g);
                return (
                  <Pressable
                    key={g}
                    onPress={() => toggle(g)}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && styles.chipPressed,
                    ]}>
                    <ThemedText
                      style={[styles.chipText, active && styles.chipTextActive]}>
                      {g}
                    </ThemedText>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <View style={styles.footer}>
            <Pressable
              onPress={clearAll}
              disabled={draftCount === 0}
              style={({ pressed }) => [
                styles.clearBtn,
                draftCount === 0 && styles.clearBtnDisabled,
                pressed && styles.clearBtnPressed,
              ]}>
              <ThemedText style={styles.clearBtnText}>Clear</ThemedText>
            </Pressable>
            <Pressable
              onPress={apply}
              style={({ pressed }) => [styles.applyBtn, pressed && styles.applyBtnPressed]}>
              <ThemedText style={styles.applyBtnText}>
                {draftCount === 0 ? 'Apply' : `Apply (${draftCount})`}
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
    maxHeight: '78%',
    minHeight: 360,
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
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  chipActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  chipPressed: { opacity: 0.7 },
  chipText: { fontSize: 13, opacity: 0.85 },
  chipTextActive: { color: '#fff', fontWeight: '600', opacity: 1 },
  empty: { textAlign: 'center', opacity: 0.6, paddingVertical: 32, width: '100%' },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  clearBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  clearBtnDisabled: { opacity: 0.4 },
  clearBtnPressed: { opacity: 0.6 },
  clearBtnText: { color: Colors.dark.text, fontSize: 14, fontWeight: '600' },
  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Brand.primary,
    alignItems: 'center',
  },
  applyBtnPressed: { opacity: 0.85, backgroundColor: Brand.primaryDark },
  applyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
