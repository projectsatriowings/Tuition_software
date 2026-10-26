/**
 * Mobile Storage Service
 * Handles secure storage of JWT access and refresh tokens, user profile, and active institute.
 */

// In-memory cache for fast synchronous access
const memoryStore: Record<string, string> = {};

export const MobileStorage = {
  async setItem(key: string, value: string): Promise<void> {
    memoryStore[key] = value;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // Memory store acts as resilient fallback
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (memoryStore[key] !== undefined) {
      return memoryStore[key];
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key);
        if (val) {
          memoryStore[key] = val;
          return val;
        }
      }
    } catch {
      // Memory store fallback
    }
    return null;
  },

  async removeItem(key: string): Promise<void> {
    delete memoryStore[key];
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {}
  },

  async clear(): Promise<void> {
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch {}
  },
};
