/**
 * Mobile Storage Service
 * Uses expo-secure-store for encrypted persistent storage on Android/iOS,
 * with resilient in-memory fallback for environments without native keystore.
 */

import * as SecureStore from 'expo-secure-store';

const memoryStore: Record<string, string> = {};

export const MobileStorage = {
  async setItem(key: string, value: string): Promise<void> {
    memoryStore[key] = value;
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // In-memory cache acts as fallback
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      const val = await SecureStore.getItemAsync(key);
      if (val !== null && val !== undefined) {
        memoryStore[key] = val;
        return val;
      }
    } catch {
      // Fallback to memoryStore
    }
    return memoryStore[key] ?? null;
  },

  async removeItem(key: string): Promise<void> {
    delete memoryStore[key];
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore fallback delete
    }
  },

  async clear(): Promise<void> {
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
  },
};
