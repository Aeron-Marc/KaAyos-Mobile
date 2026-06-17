import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '@/components/toast';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ToastProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="worker/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="provider/dashboard" options={{ presentation: 'card' }} />
        <Stack.Screen name="provider/profile-edit" options={{ presentation: 'card' }} />
        <Stack.Screen name="map" options={{ presentation: 'card' }} />
        <Stack.Screen name="modal/booking" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="dark" />
      </GestureHandlerRootView>
    </ToastProvider>
  );
}
