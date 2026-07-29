import { Platform } from 'react-native';

let SecureStore: any = null;
try {
  SecureStore = require('expo-secure-store');
} catch {}

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web' || !SecureStore) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web' || !SecureStore) {
    try { localStorage.setItem(key, value); } catch {} return;
  }
  try { await SecureStore.setItemAsync(key, value); } catch {}
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web' || !SecureStore) {
    try { localStorage.removeItem(key); } catch {} return;
  }
  try { await SecureStore.deleteItemAsync(key); } catch {}
}
