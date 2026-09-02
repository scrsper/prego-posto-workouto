import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { ExerciseLibraryScreen } from '../screens/ExerciseLibraryScreen';
import { TrackScreen } from '../screens/TrackScreen';
import { ArticlesScreen } from '../screens/ArticlesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Exercises" component={ExerciseLibraryScreen} />
      <Tab.Screen name="Track" component={TrackScreen} />
      <Tab.Screen name="Learn" component={ArticlesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
