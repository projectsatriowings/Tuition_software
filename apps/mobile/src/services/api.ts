import { AppConfig, normalizeApiUrl } from '../config/index';
import { MobileStorage } from './storage';

export interface MobileApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  message?: string;
  count?: number;
}

export interface HealthCheckResult {
  reachable: boolean;
  ok?: boolean;
  resolvedUrl?: string;
  statusCode?: number;
  message: string;
  latencyMs?: number;
  serviceOnline?: boolean;
}

let activeBaseUrl: string = normalizeApiUrl(AppConfig.defaultApiBaseUrl);
let activeBranchId: string | null = null;

/**
 * Builds a clean, fully-qualified URL preventing missing or duplicate /api segments.
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

export async function getActiveBranchId(): Promise<string | null> {
  if (activeBranchId) return activeBranchId;
  const stored = await MobileStorage.getItem(AppConfig.storageKeys.activeBranch);
  activeBranchId = stored || null;
  return activeBranchId;
}

export async function setActiveBranchId(branchId: string | null): Promise<void> {
  activeBranchId = branchId;
  if (branchId) {
    await MobileStorage.setItem(AppConfig.storageKeys.activeBranch, branchId);
  } else {
    await MobileStorage.removeItem(AppConfig.storageKeys.activeBranch);
  }
  invalidateMobileCache();
}

/**
 * Builds an authenticated URL with auth token and institute ID query parameters for browser/Linking navigation.
 */
export async function buildAuthenticatedDownloadUrl(endpoint: string): Promise<string> {
  const token = await MobileStorage.getItem(AppConfig.storageKeys.accessToken);
  const storedInstitute = await MobileStorage.getItem(AppConfig.storageKeys.activeInstitute);
  let resolvedInstituteId = '';
  if (storedInstitute) {
    try {
      resolvedInstituteId = JSON.parse(storedInstitute).id || storedInstitute;
    } catch {
      resolvedInstituteId = storedInstitute;
    }
  }

  const storedUrl = await MobileStorage.getItem(AppConfig.storageKeys.customApiUrl);
  const base = storedUrl ? normalizeApiUrl(storedUrl) : activeBaseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  const url = new URL(`${base}/${cleanEndpoint}`);
  if (token) {
    url.searchParams.set('token', token);
  }
  if (resolvedInstituteId) {
    url.searchParams.set('instituteId', resolvedInstituteId);
  }
  const branchId = await getActiveBranchId();
  if (branchId && branchId !== 'all') {
    url.searchParams.set('branchId', branchId);
  }
  return url.toString();
}

/**
 * Performs a robust diagnostic probe against target base URL to evaluate reachability
 */
export async function checkServerConnection(candidateUrl?: string): Promise<HealthCheckResult> {
  const targetBase = normalizeApiUrl(candidateUrl || activeBaseUrl);
  const healthUrl = buildApiUrl(targetBase, '/health');

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (res.ok) {
      let isOnline = true;
      try {
        const body = await res.json();
        isOnline = body.status === 'ok' || body.success === true || !!body.data;
      } catch {
        // HTTP 200 response without JSON is still reachable
      }
      return {
        reachable: true,
        ok: true,
        resolvedUrl: healthUrl,
        statusCode: res.status,
        latencyMs: latency,
        serviceOnline: isOnline,
        message: `Connected successfully (${latency}ms). Server is active.`,
      };
    } else {
      return {
        reachable: true,
        ok: false,
        resolvedUrl: healthUrl,
        statusCode: res.status,
        latencyMs: latency,
        serviceOnline: false,
        message: `Server returned HTTP ${res.status}. Endpoint reached, but server reported an error.`,
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    let diagnosticMsg = '';
    if (err.name === 'AbortError') {
      diagnosticMsg = `Connection timed out after 30s. Server at ${targetBase} did not reply. If using Render free tier, verify service is active or wake it up via browser.`;
    } else if (err.message && (err.message.includes('Cleartext') || err.message.includes('CLEARTEXT'))) {
      diagnosticMsg = `Cleartext HTTP blocked by Android. Ensure usesCleartextTraffic is enabled.`;
    } else {
      diagnosticMsg = `Could not reach ${targetBase}. Verify Wi-Fi network and ensure backend is running. Error: ${err.message || 'Network request failed'}`;
    }

    return {
      reachable: false,
      ok: false,
      resolvedUrl: healthUrl,
      latencyMs: latency,
      serviceOnline: false,
      message: diagnosticMsg,
    };
  }
}

// In-flight promise map for request deduplication
const mobileInFlight = new Map<string, Promise<any>>();
// Memory cache for read operations
const mobileCache = new Map<string, { res: any; expiry: number }>();

export function invalidateMobileCache(pattern?: string) {
  if (!pattern) {
    mobileCache.clear();
    return;
  }
  for (const k of mobileCache.keys()) {
    if (k.includes(pattern)) {
      mobileCache.delete(k);
    }
  }
}

export interface MobileRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  skipCache?: boolean;
  cacheTtlMs?: number;
  timeoutMs?: number;
  isRetry?: boolean;
  idempotencyKey?: string;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function mobileApiFetch<T = any>(
  endpoint: string,
  options: MobileRequestOptions = {}
): Promise<MobileApiResponse<T>> {
  const method = options.method || 'GET';

  // Invalidate cache on mutations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    invalidateMobileCache();
  }
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

  const branchId = await getActiveBranchId();

  const isCacheable = method === 'GET' && !options.skipCache && !endpoint.includes('/auth/login');
  const cacheKey = `${token ? token.slice(-8) : 'anon'}:${resolvedInstituteId || 'global'}:${branchId || 'all'}:${endpoint}`;

  if (isCacheable) {
    const cached = mobileCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.res as MobileApiResponse<T>;
    }
    if (mobileInFlight.has(cacheKey)) {
      return mobileInFlight.get(cacheKey) as Promise<MobileApiResponse<T>>;
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
  if (branchId && branchId !== 'all') {
    headers['x-branch-id'] = branchId;
  }
  if (options.idempotencyKey) {
    headers['x-idempotency-key'] = options.idempotencyKey;
  }

  const finalUrl = buildApiUrl(activeBaseUrl, endpoint);

  // Timeout controller
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 25000;
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
                } catch (retryErr) {
                  reject(retryErr);
                }
              },
              reject,
            });
          });
        }

        isRefreshing = true;
        try {
          const refreshRes = await fetch(buildApiUrl(activeBaseUrl, '/auth/refresh'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newAccessToken = refreshData?.data?.accessToken || refreshData?.accessToken;
            if (newAccessToken) {
              await MobileStorage.setItem(AppConfig.storageKeys.accessToken, newAccessToken);
              processQueue(null, newAccessToken);
              isRefreshing = false;
              return mobileApiFetch<T>(endpoint, {
                ...options,
                isRetry: true,
                headers: { ...options.headers, Authorization: `Bearer ${newAccessToken}` },
              });
            }
          }
          processQueue(new Error('Session expired'), null);
          isRefreshing = false;
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          isRefreshing = false;
        }
      }
    }

    let parsedData: any = null;
    try {
      parsedData = await res.json();
    } catch {
      // Body not JSON
    }

    const result: MobileApiResponse<T> = {
      success: res.ok && (parsedData?.success !== false),
      statusCode: res.status,
      data: parsedData?.data !== undefined ? parsedData.data : parsedData,
      error: parsedData?.error || (!res.ok ? `HTTP Error ${res.status}` : undefined),
      message: parsedData?.message,
      count: parsedData?.count,
    };

    if (isCacheable && result.success) {
      const ttl = options.cacheTtlMs || 60000; // 1 min default cache
      mobileCache.set(cacheKey, { res: result, expiry: Date.now() + ttl });
    }

    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    let errMsg = err.message || 'Network request failed';
    if (err.name === 'AbortError') {
      errMsg = `Request timed out after ${timeoutMs / 1000}s. Server is slow or unreachable.`;
    }
    return {
      success: false,
      error: errMsg,
      statusCode: 0,
    };
  } finally {
    mobileInFlight.delete(cacheKey);
  }
}

/**
 * Convenient REST wrapper providing .get, .post, .put, .patch, .delete returning { data: res }
 */
export const api = {
  get: async <T = any>(endpoint: string, options?: MobileRequestOptions) => {
    const res = await mobileApiFetch<T>(endpoint, { ...(options || {}), method: 'GET' });
    return { data: res };
  },
  post: async <T = any>(endpoint: string, body?: any, options?: MobileRequestOptions) => {
    const res = await mobileApiFetch<T>(endpoint, { ...(options || {}), method: 'POST', body });
    return { data: res };
  },
  put: async <T = any>(endpoint: string, body?: any, options?: MobileRequestOptions) => {
    const res = await mobileApiFetch<T>(endpoint, { ...(options || {}), method: 'PUT', body });
    return { data: res };
  },
  patch: async <T = any>(endpoint: string, body?: any, options?: MobileRequestOptions) => {
    const res = await mobileApiFetch<T>(endpoint, { ...(options || {}), method: 'PATCH', body });
    return { data: res };
  },
  delete: async <T = any>(endpoint: string, options?: MobileRequestOptions) => {
    const res = await mobileApiFetch<T>(endpoint, { ...(options || {}), method: 'DELETE' });
    return { data: res };
  },
};

export function generateIdempotencyKey(actionName: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${actionName}-${Date.now()}-${rand}`;
}
