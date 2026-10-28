import { mobileApiFetch } from './api';
import { MobileStorage } from './storage';
import { Platform } from 'react-native';

const DEVICE_PUSH_TOKEN_KEY = 'tuition_mobile_device_push_token';

export class PushNotificationService {
  /**
   * Get or generate a persistent device token for push notification routing
   */
  static async getOrCreateDeviceToken(): Promise<string> {
    try {
      let token = await MobileStorage.getItem(DEVICE_PUSH_TOKEN_KEY);
      if (!token) {
        // Generate stable unique client push token
        const randPart = Math.random().toString(36).substring(2, 10);
        const timePart = Date.now().toString(36);
        token = `ExponentPushToken[tuition_mobile_${Platform.OS}_${timePart}_${randPart}]`;
        await MobileStorage.setItem(DEVICE_PUSH_TOKEN_KEY, token);
      }
      return token;
    } catch {
      return `ExponentPushToken[tuition_mobile_fallback_${Date.now()}]`;
    }
  }

  /**
   * Register push device token with TuitionOS backend
   */
  static async registerPushToken(): Promise<boolean> {
    try {
      const token = await this.getOrCreateDeviceToken();
      const res = await mobileApiFetch('/notifications/push-token', {
        method: 'POST',
        body: {
          token,
          platform: Platform.OS || 'android',
          deviceInfo: `TuitionOS Mobile Client (${Platform.OS})`,
        },
      });
      return !!res.success;
    } catch (err) {
      console.warn('[PushNotificationService] Push token registration warning:', err);
      return false;
    }
  }

  /**
   * Unregister push token on logout
   */
  static async unregisterPushToken(): Promise<void> {
    try {
      const token = await MobileStorage.getItem(DEVICE_PUSH_TOKEN_KEY);
      if (token) {
        await mobileApiFetch('/notifications/push-token', {
          method: 'DELETE',
          body: { token },
        }).catch(() => {});
      }
    } catch {}
  }
}
