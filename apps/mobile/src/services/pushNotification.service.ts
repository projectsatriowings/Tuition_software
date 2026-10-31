import { mobileApiFetch } from './api';
import { MobileStorage } from './storage';
import { Platform } from 'react-native';

const DEVICE_PUSH_TOKEN_KEY = 'tuition_mobile_device_push_token';

export interface NotificationPayload {
  notificationId?: string;
  entityType?: string;
  entityId?: string;
  studentId?: string;
  metadata?: any;
  link?: string;
}

type NotificationTapHandler = (payload: NotificationPayload) => void;
const tapListeners = new Set<NotificationTapHandler>();
let pendingColdStartPayload: NotificationPayload | null = null;

export class PushNotificationService {
  /**
   * Register a tap listener for notifications
   */
  static addTapListener(listener: NotificationTapHandler): () => void {
    tapListeners.add(listener);
    if (pendingColdStartPayload) {
      const payload = pendingColdStartPayload;
      pendingColdStartPayload = null;
      setTimeout(() => listener(payload), 50);
    }
    return () => {
      tapListeners.delete(listener);
    };
  }

  /**
   * Dispatch a notification tap event (called from notification response listeners or cold start)
   */
  static dispatchNotificationTap(payload: NotificationPayload): void {
    if (tapListeners.size === 0) {
      pendingColdStartPayload = payload;
    } else {
      tapListeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (e) {
          console.warn('[PushNotificationService] Error executing tap listener:', e);
        }
      });
    }
  }

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
