import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, Colors } from '@/constants/theme';
import { CATEGORIES, CategoryDef, CategoryId } from '@/src/services/anilist';

interface Props {
  visible: boolean;
  selectedId: CategoryId;
  onSelect: (id: CategoryId) => void;
  onClose: () => void;
  showAdult?: boolean;
}

export function CategorySheet({ visible, selectedId, onSelect, onClose, showAdult = true }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 160,
      useNativeDriver: true,
    }).start();
    if (!visible) setQuery('');
  }, [visible, slide]);

  const filtered = useMemo<CategoryDef[]>(() => {
    const q = query.trim().toLowerCase();
    const pool = showAdult ? CATEGORIES : CATEGORIES.filter((c) => !c.adult);
    if (!q) return pool;
    return pool.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [query, showAdult]);

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
            <ThemedText style={styles.title}>Choose category</ThemedText>
            <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => pressed && styles.closePressed}>
              <ThemedText style={styles.closeText}>Done</ThemedText>
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            <TextInput
              placeholder="Search categories…"
              placeholderTextColor={Colors.dark.muted}
              value={query}
              onChangeText={setQuery}
              style={styles.search}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <ThemedText style={styles.empty}>No categories match “{query.trim()}”.</ThemedText>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item.id);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.row,
                  item.id === selectedId && styles.rowActive,
                  pressed && styles.rowPressed,
                ]}>
                <View style={styles.rowText}>
                  <ThemedText
                    style={[styles.rowName, item.id === selectedId && styles.rowNameActive]}>
                    {item.name}
                  </ThemedText>
                  <ThemedText style={styles.rowDesc} numberOfLines={1}>
                    {item.description}
                  </ThemedText>
                </View>
                {item.id === selectedId ? (
                  <ThemedText style={styles.checkmark}>✓</ThemedText>
                ) : null}
              </Pressable>
            )}
          />
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
    paddingBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '700' },
  closePressed: { opacity: 0.5 },
  closeText: { color: Brand.primaryLight, fontWeight: '600', fontSize: 15 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  search: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  empty: { textAlign: 'center', opacity: 0.6, paddingVertical: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
  },
  rowActive: { backgroundColor: 'rgba(139,92,246,0.12)' },
  rowPressed: { opacity: 0.7 },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontSize: 16, fontWeight: '600' },
  rowNameActive: { color: Brand.primaryLight },
  rowDesc: { fontSize: 12, opacity: 0.6 },
  checkmark: { color: Brand.primaryLight, fontSize: 18, fontWeight: '700' },
});
