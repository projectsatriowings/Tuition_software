/**
 * Safe WebM Duration Fixer Utility
 *
 * MediaRecorder in Chromium creates WebM files without duration metadata in the container header.
 * This utility dynamically applies @fix-webm-duration/fix if available, and gracefully falls back
 * to the unmodified raw blob if duration patching is unavailable or fails.
 */

type FixWebmFn = (blob: Blob, durationMs: number) => Promise<Blob>;
let cachedFixFn: FixWebmFn | null = null;

export async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (!blob || durationMs <= 0) return blob;

  try {
    if (!cachedFixFn) {
      // Dynamic import to prevent bundler failure if package is unresolved
      const mod = await import('@fix-webm-duration/fix');
      cachedFixFn =
        (mod as any).fixWebmDuration ||
        (mod as any).default?.fixWebmDuration ||
        (mod as any).default;
    }

    if (typeof cachedFixFn === 'function') {
      return await cachedFixFn(blob, durationMs);
    }
  } catch (err) {
    console.warn('[WebM Duration Fixer] Fallback to raw recorded blob:', err);
  }

  return blob;
}
