import React, { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useJourneyStore } from '../state/journeyStore';
import { MainTabs } from './MainTabs';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { NewJourneyScreen } from '../screens/NewJourneyScreen';
import { JourneyArchiveScreen } from '../screens/JourneyArchiveScreen';
import { ExerciseDetailScreen } from '../screens/ExerciseDetailScreen';
import { WorkoutPlayerScreen } from '../screens/WorkoutPlayerScreen';
import { DailyCheckInScreen } from '../screens/DailyCheckInScreen';
import { KickCounterScreen } from '../screens/KickCounterScreen';
import { ContractionTimerScreen } from '../screens/ContractionTimerScreen';
import { SafetyChecklistScreen } from '../screens/SafetyChecklistScreen';
import { ClearanceAcknowledgmentScreen } from '../screens/ClearanceAcknowledgmentScreen';
import { DeliveryScreen } from '../screens/DeliveryScreen';
import { ArticleDetailScreen } from '../screens/ArticleDetailScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { PrivacyScreen } from '../screens/PrivacyScreen';
import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Page-sheet modals get an explicit Close button in addition to swipe-to-dismiss. */
function modalOptions(title: string): (props: { navigation: { goBack: () => void } }) => NativeStackNavigationOptions {
  return ({ navigation }) => ({
    title,
    presentation: 'modal',
    headerRight: () => (
      <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" hitSlop={10}>
        <Text style={{ color: colors.primaryDark, fontSize: 17, fontWeight: '600' }}>Close</Text>
      </Pressable>
    ),
  });
}

export function RootNavigator() {
  const activeJourneyId = useJourneyStore((state) => state.activeJourneyId);
  const runAutoArchiveSweep = useJourneyStore((state) => state.runAutoArchiveSweep);

  // App.tsx only mounts this after hydration.
  useEffect(() => {
    runAutoArchiveSweep();
  }, [runAutoArchiveSweep]);

  return (
    <Stack.Navigator
      initialRouteName={activeJourneyId ? 'MainTabs' : 'Welcome'}
      screenOptions={{
        headerTintColor: colors.primaryDark,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NewJourney" component={NewJourneyScreen} options={{ title: 'Your Journey' }} />
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false, title: 'Today' }} />
      <Stack.Screen name="JourneyArchive" component={JourneyArchiveScreen} options={{ title: 'Journey History' }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
      <Stack.Screen
        name="WorkoutPlayer"
        component={WorkoutPlayerScreen}
        options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="DailyCheckIn"
        component={DailyCheckInScreen}
        options={modalOptions('Daily Check-in')}
      />
      <Stack.Screen name="KickCounter" component={KickCounterScreen} options={{ title: 'Kick Counter' }} />
      <Stack.Screen name="ContractionTimer" component={ContractionTimerScreen} options={{ title: 'Contraction Timer' }} />
      <Stack.Screen name="SafetyChecklist" component={SafetyChecklistScreen} options={{ title: 'Warning Signs' }} />
      <Stack.Screen name="ClearanceAcknowledgment" component={ClearanceAcknowledgmentScreen} options={{ title: 'Provider Clearance' }} />
      <Stack.Screen name="Delivery" component={DeliveryScreen} options={modalOptions('Birth Details')} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="Paywall" component={PaywallScreen} options={modalOptions('Premium')} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy' }} />
    </Stack.Navigator>
  );
}
