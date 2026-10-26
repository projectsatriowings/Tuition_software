import { AppConfig } from '../config/index';
import { MobileStorage } from './storage';

export interface MobileApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

let activeBaseUrl: string = AppConfig.defaultApiBaseUrl;

export function setApiBaseUrl(url: string) {
  activeBaseUrl = url.replace(/\/+$/, '');
  MobileStorage.setItem(AppConfig.storageKeys.customApiUrl, activeBaseUrl);
}

export function getApiBaseUrl(): string {
  return activeBaseUrl;
}

// Generate unique idempotency key for transactions
export function generateIdempotencyKey(prefix: string = 'MOB'): string {
  return `${prefix}-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

export async function mobileApiFetch<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    idempotencyKey?: string;
    isRetry?: boolean;
  } = {}
): Promise<MobileApiResponse<T>> {
  // Check custom URL in storage if not initialized
  const storedUrl = await MobileStorage.getItem(AppConfig.storageKeys.customApiUrl);
  if (storedUrl) {
    activeBaseUrl = storedUrl;
  }

  const token = await MobileStorage.getItem(AppConfig.storageKeys.accessToken);
  const instituteId = await MobileStorage.getItem(AppConfig.storageKeys.activeInstitute);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (instituteId) {
    headers['x-institute-id'] = instituteId;
  }
  if (options.idempotencyKey) {
    headers['x-idempotency-key'] = options.idempotencyKey;
  }

  const url = `${activeBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Handle token expiry & automatic refresh
    if (res.status === 401 && !options.isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      const refreshToken = await MobileStorage.getItem(AppConfig.storageKeys.refreshToken);
      if (refreshToken) {
        if (isRefreshing) {
          return new Promise<MobileApiResponse<T>>((resolve, reject) => {
            failedQueue.push({
              resolve: async (newToken: string) => {
                try {
                  const retryRes = await mobileApiFetch<T>(endpoint, {
                    ...options,
                    isRetry: true,
                    headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
                  });
                  resolve(retryRes);
                } catch (e) {
                  reject(e);
                }
              },
              reject,
            });
          });
        }

        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${activeBaseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          const refreshJson: any = await refreshRes.json();
          if (refreshRes.ok && refreshJson.success && refreshJson.data?.accessToken) {
            const newAccessToken = refreshJson.data.accessToken;
            const newRefreshToken = refreshJson.data.refreshToken || refreshToken;

            await MobileStorage.setItem(AppConfig.storageKeys.accessToken, newAccessToken);
            await MobileStorage.setItem(AppConfig.storageKeys.refreshToken, newRefreshToken);

            processQueue(null, newAccessToken);
            isRefreshing = false;

            return mobileApiFetch<T>(endpoint, {
              ...options,
              isRetry: true,
            });
          } else {
            // Refresh failed: clear session
            processQueue(new Error('Session expired'), null);
            isRefreshing = false;
            await MobileStorage.removeItem(AppConfig.storageKeys.accessToken);
            await MobileStorage.removeItem(AppConfig.storageKeys.refreshToken);
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          isRefreshing = false;
        }
      }
    }

    const text = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: text || `HTTP ${res.status}` };
    }

    if (!res.ok) {
      return {
        success: false,
        error: json.error || `Server returned HTTP ${res.status}`,
        data: json.data,
        timestamp: new Date().toISOString(),
      };
    }

    return json;
  } catch (netErr: any) {
    return {
      success: false,
      error: `Network error connecting to ${activeBaseUrl}. Verify TuitionOS server is running and device network is active.`,
      timestamp: new Date().toISOString(),
    };
  }
}
