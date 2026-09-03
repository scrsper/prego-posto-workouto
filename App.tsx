import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { DevContentWarningBanner } from './src/components/DevContentWarningBanner';

// Keeps the native splash screen up until the Journey store has finished
// rehydrating from AsyncStorage (RootNavigator calls SplashScreen.hideAsync()
// once `hasHydrated` is true) — without this, the splash could hide before
// hydration finishes, showing a blank frame in between.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Safe to ignore — e.g. already called, or unsupported in this environment.
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DevContentWarningBanner />
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="dark" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
