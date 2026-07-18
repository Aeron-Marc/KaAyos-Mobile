import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '@/components/toast';
import { AuthProvider } from '@/lib/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(tabs-provider)" />
          <Stack.Screen name="worker/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="profile-edit" options={{ presentation: 'card' }} />
          <Stack.Screen name="map" options={{ presentation: 'card' }} />
          <Stack.Screen name="modal/booking" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="dark" />
        </GestureHandlerRootView>
      </ToastProvider>
    </AuthProvider>
  );
}
