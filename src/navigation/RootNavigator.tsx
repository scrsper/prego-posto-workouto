import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useJourneyStore } from '../state/journeyStore';
import { MainTabs } from './MainTabs';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { NewJourneyScreen } from '../screens/NewJourneyScreen';
import { JourneyArchiveScreen } from '../screens/JourneyArchiveScreen';
import { ExerciseDetailScreen } from '../screens/ExerciseDetailScreen';
import { DailyCheckInScreen } from '../screens/DailyCheckInScreen';
import { KickCounterScreen } from '../screens/KickCounterScreen';
import { ContractionTimerScreen } from '../screens/ContractionTimerScreen';
import { SafetyChecklistScreen } from '../screens/SafetyChecklistScreen';
import { ClearanceAcknowledgmentScreen } from '../screens/ClearanceAcknowledgmentScreen';
import { ArticleDetailScreen } from '../screens/ArticleDetailScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const hasHydrated = useJourneyStore((state) => state.hasHydrated);
  const activeJourneyId = useJourneyStore((state) => state.activeJourneyId);
  const runAutoArchiveSweep = useJourneyStore((state) => state.runAutoArchiveSweep);
  const initializePurchases = useJourneyStore((state) => state.initializePurchases);

  useEffect(() => {
    if (hasHydrated) runAutoArchiveSweep();
  }, [hasHydrated, runAutoArchiveSweep]);

  useEffect(() => {
    // Configures RevenueCat (no-op/falls back to the local mock if it
    // isn't available — e.g. Expo Go, or no API key set) and syncs
    // subscriptionActive with whatever RevenueCat currently reports.
    initializePurchases();
  }, [initializePurchases]);

  if (!hasHydrated) return null;

  return (
    <Stack.Navigator
      initialRouteName={activeJourneyId ? 'MainTabs' : 'Welcome'}
      screenOptions={{
        headerTintColor: colors.primaryDark,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NewJourney" component={NewJourneyScreen} options={{ title: 'New Journey' }} />
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="JourneyArchive" component={JourneyArchiveScreen} options={{ title: 'Journey History' }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
      <Stack.Screen name="DailyCheckIn" component={DailyCheckInScreen} options={{ title: 'Check-in' }} />
      <Stack.Screen name="KickCounter" component={KickCounterScreen} options={{ title: 'Kick Counter' }} />
      <Stack.Screen name="ContractionTimer" component={ContractionTimerScreen} options={{ title: 'Contraction Timer' }} />
      <Stack.Screen name="SafetyChecklist" component={SafetyChecklistScreen} options={{ title: 'Safety' }} />
      <Stack.Screen
        name="ClearanceAcknowledgment"
        component={ClearanceAcknowledgmentScreen}
        options={{ title: 'Clearance' }}
      />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} options={{ title: 'Article' }} />
      <Stack.Screen name="Paywall" component={PaywallScreen} options={{ title: 'Premium', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
