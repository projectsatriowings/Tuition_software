import { AppConfig, normalizeApiUrl } from '../config/index';
import { MobileStorage } from './storage';

export interface MobileApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface HealthCheckResult {
  ok: boolean;
  service?: string;
  databaseConnected?: boolean;
  latencyMs?: number;
  statusCode?: number;
  resolvedUrl: string;
  message: string;
}

let activeBaseUrl: string = normalizeApiUrl(AppConfig.defaultApiBaseUrl);

/**
 * Builds a clean, fully-qualified URL preventing missing or duplicate /api segments.
 * Example inputs:
 *   baseUrl: "http://192.168.1.5:5000", endpoint: "/auth/login" -> "http://192.168.1.5:5000/api/auth/login"
 *   baseUrl: "http://192.168.1.5:5000/api", endpoint: "/api/auth/login" -> "http://192.168.1.5:5000/api/auth/login"
 *   baseUrl: "http://192.168.1.5:5000/api", endpoint: "health" -> "http://192.168.1.5:5000/api/health"
 */
export function buildApiUrl(base: string, endpoint: string): string {
  const normBase = normalizeApiUrl(base); // always ends with /api
  let cleanEndpoint = (endpoint || '').trim();

  // Strip leading slash
  if (cleanEndpoint.startsWith('/')) {
    cleanEndpoint = cleanEndpoint.substring(1);
  }

  // Prevent duplicate /api/api
  if (cleanEndpoint.toLowerCase().startsWith('api/')) {
    cleanEndpoint = cleanEndpoint.substring(4);
  } else if (cleanEndpoint.toLowerCase() === 'api') {
    cleanEndpoint = '';
  }

  return cleanEndpoint ? `${normBase}/${cleanEndpoint}` : normBase;
}

export function setApiBaseUrl(url: string) {
  activeBaseUrl = normalizeApiUrl(url);
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

/**
 * Proactively tests server reachability and health check against candidate or active API URL
 */
export async function checkServerConnection(candidateUrl?: string): Promise<HealthCheckResult> {
  const targetBase = candidateUrl ? normalizeApiUrl(candidateUrl) : activeBaseUrl;
  const healthUrl = buildApiUrl(targetBase, '/health');

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      return {
        ok: false,
        statusCode: res.status,
        resolvedUrl: healthUrl,
        message: `Server reached but responded with HTTP ${res.status}. Check backend logs.`,
      };
    }

    const data = await res.json();
    const isHealthy = data.status === 'healthy' || data.database?.connected;

    return {
      ok: true,
      service: data.service || 'tuition-management-api',
      databaseConnected: data.database?.connected ?? true,
      latencyMs,
      statusCode: res.status,
      resolvedUrl: healthUrl,
      message: `Connected successfully (${latencyMs}ms). Database: ${
        data.database?.connected ? 'Online' : 'Degraded'
      }`,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    let diagnosticMsg = '';
    if (err.name === 'AbortError') {
      diagnosticMsg = `Connection timed out after 7s. Server at ${targetBase} did not reply.`;
    } else if (err.message && (err.message.includes('Cleartext') || err.message.includes('CLEARTEXT'))) {
      diagnosticMsg = `Cleartext HTTP blocked by Android. Ensure usesCleartextTraffic is enabled.`;
    } else {
      diagnosticMsg = `Cannot connect to ${targetBase}. Verify: 1) Computer & phone on same Wi-Fi; 2) Backend running on port 5000; 3) Windows Firewall allows port 5000.`;
    }

    return {
      ok: false,
      latencyMs,
      resolvedUrl: healthUrl,
      message: diagnosticMsg,
    };
  }
}

export async function mobileApiFetch<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    idempotencyKey?: string;
    isRetry?: boolean;
    timeoutMs?: number;
  } = {}
): Promise<MobileApiResponse<T>> {
  // Check custom URL in storage if not initialized
  const storedUrl = await MobileStorage.getItem(AppConfig.storageKeys.customApiUrl);
  if (storedUrl) {
    activeBaseUrl = normalizeApiUrl(storedUrl);
  }

  const token = await MobileStorage.getItem(AppConfig.storageKeys.accessToken);
  const storedInstitute = await MobileStorage.getItem(AppConfig.storageKeys.activeInstitute);
  let resolvedInstituteId: string | null = null;
  if (storedInstitute) {
    if (storedInstitute.startsWith('{')) {
      try {
        resolvedInstituteId = JSON.parse(storedInstitute).id || null;
      } catch {
        resolvedInstituteId = storedInstitute;
      }
    } else {
      resolvedInstituteId = storedInstitute;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (resolvedInstituteId) {
    headers['x-institute-id'] = resolvedInstituteId;
  }
  if (options.idempotencyKey) {
    headers['x-idempotency-key'] = options.idempotencyKey;
  }

  const finalUrl = buildApiUrl(activeBaseUrl, endpoint);

  // 12-second timeout controller
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 12000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(finalUrl, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

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
          const refreshUrl = buildApiUrl(activeBaseUrl, '/auth/refresh');
          const refreshRes = await fetch(refreshUrl, {
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
      let friendlyError = json.error;
      if (!friendlyError) {
        if (res.status === 401) friendlyError = 'Authentication failed. Please check your credentials.';
        else if (res.status === 403) friendlyError = 'Access denied. You do not have permission for this resource.';
        else if (res.status === 404) friendlyError = `Endpoint not found (404) on ${activeBaseUrl}.`;
        else if (res.status >= 500) friendlyError = `Server error (${res.status}). Please try again later.`;
        else friendlyError = `Server returned HTTP ${res.status}`;
      }

      return {
        success: false,
        error: friendlyError,
        data: json.data,
        timestamp: new Date().toISOString(),
      };
    }

    return json;
  } catch (netErr: any) {
    clearTimeout(timeoutId);

    let specificError = '';
    if (netErr.name === 'AbortError') {
      specificError = `Request timed out connecting to ${activeBaseUrl}. The server did not respond within ${timeoutMs / 1000}s.`;
    } else if (netErr.message && (netErr.message.includes('Cleartext') || netErr.message.includes('CLEARTEXT'))) {
      specificError = `Android cleartext HTTP blocked. Development requires usesCleartextTraffic: true in app.json.`;
    } else {
      specificError = `Network error connecting to ${activeBaseUrl}. Ensure your phone is on the same Wi-Fi network, Windows Firewall allows port 5000, and backend is running.`;
    }

    return {
      success: false,
      error: specificError,
      timestamp: new Date().toISOString(),
    };
  }
}
