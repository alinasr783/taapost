/**
 * Supabase Storage image optimizer.
 * Converts public object URLs to the render/image transform endpoint
 * so cards download small thumbnails and heroes download reasonably sized images.
 *
 * Example:
 *   .../storage/v1/object/public/media/foo.jpg
 *   -> .../storage/v1/render/image/public/media/foo.jpg?width=640&quality=70
 */

const TRANSFORM_MARKER = '/storage/v1/object/public/';
const TRANSFORM_REPLACEMENT = '/storage/v1/render/image/public/';

export type ImagePreset = 'card' | 'hero' | 'thumb' | 'original';

const PRESET_PARAMS: Record<Exclude<ImagePreset, 'original'>, string> = {
  card: 'width=640&quality=70',
  hero: 'width=1200&quality=75',
  thumb: 'width=160&quality=60',
};

function hasQuery(url: string) {
  return url.includes('?');
}

export function getOptimizedImage(src: string | null | undefined, preset: ImagePreset = 'card'): string {
  if (!src) return '';
  const s = src.trim();
  if (!s) return '';
  if (preset === 'original') return s;
  // Only transform Supabase public object URLs; leave external/data/blob as-is.
  if (s.startsWith('data:') || s.startsWith('blob:')) return s;
  if (!s.includes(TRANSFORM_MARKER)) return s;
  if (s.includes('/render/image/')) return s;
  const params = PRESET_PARAMS[preset];
  const sep = hasQuery(s) ? '&' : '?';
  return s.replace(TRANSFORM_MARKER, TRANSFORM_REPLACEMENT) + `${sep}${params}`;
}

/** Preload an image so the detail hero is already in HTTP cache on navigation. */
export function preloadImage(src: string | null | undefined, preset: ImagePreset = 'hero') {
  const url = getOptimizedImage(src, preset);
  if (!url || typeof document === 'undefined') return;
  try {
    if (document.querySelector(`link[rel="preload"][href="${CSS.escape(url)}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    link.fetchPriority = 'high';
    document.head.appendChild(link);
  } catch {
    /* ignore */
  }
}
