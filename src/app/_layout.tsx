import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProProvider } from '../context/ProContext';
import { ScanProvider } from '../context/ScanContext';
import { useColors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const c = useColors();
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <ProProvider>
        <ScanProvider>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerStyle: { backgroundColor: c.bg },
              headerTintColor: c.primary,
              headerTitleStyle: { color: c.text, fontWeight: '700' },
              contentStyle: { backgroundColor: c.bg },
              headerBackButtonDisplayMode: 'minimal',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="category/[id]" options={{ title: '' }} />
            <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal', headerShown: false }} />
          </Stack>
        </ScanProvider>
      </ProProvider>
    </SafeAreaProvider>
  );
}
