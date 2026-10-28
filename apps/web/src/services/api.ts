const API_BASE = '/api';

/**
 * Robust authentication token retrieval across potential storage keys
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return (
    localStorage.getItem('tuition_token') ||
    localStorage.getItem('tuition_access_token') ||
    localStorage.getItem('tuition_mobile_access_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    null
  );
}

/**
 * Robust active institute ID retrieval across potential storage keys and cached objects
 */
export function getActiveInstituteId(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  let instituteId = localStorage.getItem('tuition_active_institute_id');

  if (!instituteId) {
    const savedInst = localStorage.getItem('tuition_active_institute') || localStorage.getItem('tuition_mobile_institute');
    if (savedInst) {
      try {
        const parsed = JSON.parse(savedInst);
        if (parsed?.id) {
          instituteId = parsed.id;
          localStorage.setItem('tuition_active_institute_id', parsed.id);
        }
      } catch {
        // ignore parse error
      }
    }
  }

  if (!instituteId) {
    const savedUser = localStorage.getItem('tuition_user') || localStorage.getItem('tuition_mobile_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const instId =
          parsed?.instituteId ||
          parsed?.memberships?.[0]?.instituteId ||
          parsed?.memberships?.[0]?.institute?.id;
        if (instId) {
          instituteId = instId;
          localStorage.setItem('tuition_active_institute_id', instId);
        }
      } catch {
        // ignore parse error
      }
    }
  }

  return instituteId || null;
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const instituteId = getActiveInstituteId();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (!endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/register')) {
    console.warn(`[apiFetch] Warning: Invoking ${endpoint} without an authorization token in localStorage.`);
  }

  if (instituteId) {
    headers['x-institute-id'] = instituteId;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    console.error(`[apiFetch] Network failure for ${endpoint}:`, netErr);
    throw new Error('TuitionOS Backend server is unreachable. Please verify the backend server is running on port 5000 (npm run dev:server).');
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    if (response.status >= 500) {
      console.error(`[apiFetch] HTTP ${response.status} 500 Server Error for ${endpoint}`);
      throw new Error('TuitionOS Backend is not responding (port 5000 unreachable). Run `npm run dev:server` in terminal.');
    }
    console.error(`[apiFetch] Failed to parse JSON response for ${endpoint} (HTTP ${response.status})`);
    throw new Error(`Server returned unexpected response (HTTP ${response.status})`);
  }

  if (!response.ok) {
    console.error(`[apiFetch] Request rejected (HTTP ${response.status}) on ${endpoint}:`, data);
    const errMessage = data?.error || `HTTP ${response.status}: Request failed`;
    const customErr = new Error(errMessage);
    (customErr as any).status = response.status;
    (customErr as any).data = data;
    throw customErr;
  }

  return data;
}
