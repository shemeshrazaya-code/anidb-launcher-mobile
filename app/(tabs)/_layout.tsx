import { Tabs } from 'expo-router';
import React from 'react';

import { AppTabBar } from '@/components/app-tab-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.dark.tint,
        tabBarInactiveTintColor: Colors.dark.muted,
        tabBarHideOnKeyboard: true,
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
      tabBar={(props) => <AppTabBar {...props} />}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="star.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
