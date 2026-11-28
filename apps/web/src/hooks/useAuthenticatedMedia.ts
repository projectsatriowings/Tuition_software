import { useState, useEffect } from 'react';
import { getAuthToken, getActiveInstituteId } from '../services/api';

interface UseAuthenticatedMediaResult {
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches a protected media URL with JWT Authorization and institute headers,
 * returning a local Object URL (blob:) with automatic cleanup on unmount.
 */
export function useAuthenticatedMedia(src?: string | null): UseAuthenticatedMediaResult {
  const [blobUrl, setBlobUrl] = useState<string | null>(() => {
    if (!src) return null;
    if (src.startsWith('blob:') || src.startsWith('data:')) return src;
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (!src) return false;
    return !(src.startsWith('blob:') || src.startsWith('data:'));
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setBlobUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setBlobUrl(src);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let activeObjectUrl: string | null = null;

    setLoading(true);
    setError(null);

    const token = getAuthToken();
    const instituteId = getActiveInstituteId();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (instituteId) {
      headers['x-institute-id'] = instituteId;
    }

    fetch(src, { headers, signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        activeObjectUrl = URL.createObjectURL(blob);
        setBlobUrl(activeObjectUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || err.name === 'AbortError') return;
        setError(err.message || 'Failed to load media');
        setLoading(false);
      });

    return () => {
      controller.abort();
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
    };
  }, [src]);

  return { blobUrl, loading, error };
}
