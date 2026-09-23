import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import type { RootStackParamList } from './src/navigation/types';
import { DevContentWarningBanner } from './src/components/DevContentWarningBanner';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useJourneyStore } from './src/state/journeyStore';
import { configureBilling } from './src/premium/billing';
import { REMINDER_ROUTE } from './src/notifications/reminders';
import { colors } from './src/theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const navigationRef = createNavigationContainerRef<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

export default function App() {
  const hasHydrated = useJourneyStore((state) => state.hasHydrated);
  const [navigationReady, setNavigationReady] = useState(false);
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  // Keep entitlements in sync with the App Store (renewals, refunds, restores).
  useEffect(() => configureBilling((snapshot) => useJourneyStore.getState().applyStoreSnapshot(snapshot)), []);

  // Tapping the daily reminder opens the check-in.
  useEffect(() => {
    if (!navigationReady || !lastNotificationResponse) return;
    const route = lastNotificationResponse.notification.request.content.data?.route;
    if (route === REMINDER_ROUTE && useJourneyStore.getState().activeJourneyId && navigationRef.isReady()) {
      navigationRef.navigate('DailyCheckIn');
    }
  }, [navigationReady, lastNotificationResponse]);

  if (!hasHydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <DevContentWarningBanner />
          <NavigationContainer
            ref={navigationRef}
            theme={navigationTheme}
            onReady={() => {
              setNavigationReady(true);
              SplashScreen.hideAsync().catch(() => {});
            }}
          >
            <RootNavigator />
            <StatusBar style="dark" />
          </NavigationContainer>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
