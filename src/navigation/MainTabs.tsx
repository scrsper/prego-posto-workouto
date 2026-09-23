import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { MainTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { ExerciseLibraryScreen } from '../screens/ExerciseLibraryScreen';
import { TrackScreen } from '../screens/TrackScreen';
import { ArticlesScreen } from '../screens/ArticlesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_SYMBOLS: Record<keyof MainTabParamList, SFSymbol> = {
  Today: 'sun.max.fill',
  Exercises: 'figure.cooldown',
  Track: 'chart.bar.fill',
  Learn: 'book.fill',
  Settings: 'gearshape.fill',
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => (
          <SymbolView name={TAB_SYMBOLS[route.name]} tintColor={color} size={size} style={{ width: size, height: size }} />
        ),
      })}
    >
      <Tab.Screen name="Today" component={HomeScreen} />
      <Tab.Screen name="Exercises" component={ExerciseLibraryScreen} />
      <Tab.Screen name="Track" component={TrackScreen} />
      <Tab.Screen name="Learn" component={ArticlesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
