import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createApiClient, type Tokens } from './api-client';

const KEY = 'tourgo.mobile.tokens';
function localApi() {
  const host = Constants.expoConfig?.hostUri;
  if (host && !host.includes('.exp.direct')) {
    try { return `http://${new URL(`http://${host}`).hostname}:3000/api`; } catch {}
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
}

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || localApi(),
  storage: {
    async read() {
      const raw = Platform.OS === 'web' ? globalThis.sessionStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
      if (!raw) return null;
      try {
        const value: Tokens = JSON.parse(raw);
        return typeof value.accessToken === 'string' && typeof value.refreshToken === 'string' ? value : null;
      } catch { return null; }
    },
    async write(value) {
      if (Platform.OS === 'web') {
        if (value) globalThis.sessionStorage?.setItem(KEY, JSON.stringify(value));
        else globalThis.sessionStorage?.removeItem(KEY);
      } else if (value) await SecureStore.setItemAsync(KEY, JSON.stringify(value), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
      else await SecureStore.deleteItemAsync(KEY);
    },
  },
});
