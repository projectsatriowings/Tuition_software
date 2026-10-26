const API_BASE = '/api';

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('tuition_token');
  const instituteId = localStorage.getItem('tuition_active_institute_id');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
    throw new Error('TuitionOS Backend server is unreachable. Please verify the backend server is running on port 5000 (npm run dev:server).');
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    if (response.status >= 500) {
      throw new Error('TuitionOS Backend is not responding (port 5000 unreachable). Run `npm run dev:server` in terminal.');
    }
    throw new Error(`Server returned unexpected response (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: Request failed`);
  }

  return data;
}
