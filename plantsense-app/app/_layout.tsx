import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AuthContext, useAuthProvider } from '../stores/authStore';
import { useWeatherStore } from '../stores/weatherStore';
import { useGardenStore } from '../stores/gardenStore';
import { useDiagnosisStore } from '../stores/diagnosisStore';
import { useReminderStore } from '../stores/reminderStore';

function AppBootstrap({ children }: { children: React.ReactNode }) {
  const auth = useAuthProvider();
  const fetchWeather = useWeatherStore(s => s.fetchWeather);
  const loadGarden = useGardenStore(s => s.loadGarden);
  const loadRecords = useDiagnosisStore(s => s.loadRecords);
  const loadReminders = useReminderStore(s => s.loadReminders);
  const loadSavedCity = useWeatherStore(s => s.loadSavedCity);

  useEffect(() => {
    // loadSavedCity must run before fetchWeather so the correct city coords are used
    loadSavedCity().then(() => fetchWeather());
    loadGarden();
    loadRecords();
    loadReminders();
  }, []);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppBootstrap>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f5f9f2' }, animation: 'fade', animationDuration: 200 }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="diagnosis-result" />
            <Stack.Screen name="add-plant" />
            <Stack.Screen name="plant-detail" />
            <Stack.Screen name="expert-chat" />
            <Stack.Screen name="light-meter" />
            <Stack.Screen name="garden-plant-detail" />
            <Stack.Screen name="prediction" />
            <Stack.Screen name="city-picker" options={{ presentation: 'modal', headerShown: false }} />
          </Stack>
        </AppBootstrap>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
