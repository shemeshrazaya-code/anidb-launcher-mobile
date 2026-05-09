import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Colors } from '@/constants/theme';

const TAB_ACCENTS: Record<string, { color: string; soft: string; border: string }> = {
  index: {
    color: '#67e8f9',
    soft: 'rgba(103, 232, 249, 0.18)',
    border: 'rgba(103, 232, 249, 0.32)',
  },
  favorites: {
    color: '#fbbf24',
    soft: 'rgba(251, 191, 36, 0.18)',
    border: 'rgba(251, 191, 36, 0.34)',
  },
  settings: {
    color: Brand.primaryLight,
    soft: Brand.primarySoft,
    border: 'rgba(167, 139, 250, 0.34)',
  },
};

const FALLBACK_ACCENT = {
  color: Brand.primaryLight,
  soft: Brand.primarySoft,
  border: 'rgba(167, 139, 250, 0.34)',
};

export function AppTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset }]}>
      <LinearGradient
        colors={['rgba(18, 21, 25, 0.96)', 'rgba(10, 12, 16, 0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.rail}>
        <View style={styles.innerRail}>
          {state.routes.map((route, index) => {
            const descriptor = descriptors[route.key];
            const options = descriptor.options;
            const focused = state.index === index;
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name;
            const accent = TAB_ACCENTS[route.name] ?? FALLBACK_ACCENT;
            const color = focused ? accent.color : Colors.dark.muted;
            const icon = options.tabBarIcon?.({
              focused,
              color,
              size: focused ? 27 : 25,
            });

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            const onPressIn = () => {
              if (Platform.OS !== 'web') {
                Haptics.selectionAsync().catch(() => {});
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                hitSlop={6}
                onLongPress={onLongPress}
                onPress={onPress}
                onPressIn={onPressIn}
                style={({ pressed }) => [
                  styles.item,
                  focused && [styles.itemFocused, { borderColor: accent.border }],
                  pressed && styles.itemPressed,
                ]}
                testID={options.tabBarButtonTestID}>
                {({ pressed }) => (
                  <View style={styles.itemContent}>
                    {focused ? (
                      <LinearGradient
                        colors={[accent.soft, 'rgba(255,255,255,0.045)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    ) : null}
                    <View
                      style={[
                        styles.iconWell,
                        focused && {
                          backgroundColor: accent.soft,
                          borderColor: accent.border,
                        },
                      ]}>
                      {icon}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.label,
                        focused && [styles.labelFocused, { color: accent.color }],
                        pressed && styles.labelPressed,
                      ]}>
                      {label}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  rail: {
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 16,
  },
  innerRail: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    flexDirection: 'row',
    gap: 8,
    minHeight: 74,
    padding: 8,
  },
  item: {
    borderColor: 'transparent',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 58,
    overflow: 'hidden',
  },
  itemFocused: {
    backgroundColor: 'rgba(255,255,255,0.065)',
  },
  itemPressed: {
    opacity: 0.78,
    transform: [{ translateY: 1 }],
  },
  itemContent: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  iconWell: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 42,
  },
  label: {
    color: Colors.dark.muted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    maxWidth: '100%',
  },
  labelFocused: {
    fontSize: 12,
  },
  labelPressed: {
    color: Colors.dark.text,
  },
});
