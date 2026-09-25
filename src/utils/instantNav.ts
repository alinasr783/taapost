import type { NavigateFunction } from 'react-router-dom';
import type { QueryClient } from '@tanstack/react-query';
import type { Article } from '../lib/supabase';
import { preloadImage } from './supabaseImage';

/**
 * Instant-open infrastructure:
 * - Card data is cached synchronously before navigation, so the detail page
 *   can paint the hero/title/meta immediately (no blank loading screen).
 * - Navigation is wrapped in View Transitions API when available, giving the
 *   "image flies from card to hero" shared-element animation for free.
 */

// ---------------------------------------------------------------------------
// Preview cache (module-level so it's synchronous, no async storage needed)
// ---------------------------------------------------------------------------

const previewMap = new Map<number, Article>();

export function setArticlePreview(article: Article | null | undefined) {
  if (!article || typeof article.id !== 'number') return;
  previewMap.set(article.id, article);
  // Keep it small.
  if (previewMap.size > 60) {
    const first = previewMap.keys().next().value;
    if (typeof first === 'number') previewMap.delete(first);
  }
  preloadImage(article.image, 'hero');
}

export function getArticlePreview(id: number | null | undefined): Article | undefined {
  if (id == null) return undefined;
  return previewMap.get(id);
}

export function primeArticleQueries(_queryClient: QueryClient | null, article: Article | null | undefined) {
  // IMPORTANT: only seed the synchronous preview Map — never setQueryData here.
  // Writing a content-less card object into the detail query key marks it
  // "fresh" and blocks the real fetch, leaving the content skeleton forever.
  // Detail pages read the Map via placeholderData (doesn't block fetching).
  setArticlePreview(article);
}

// ---------------------------------------------------------------------------
// Instant navigation with shared-element transition
// ---------------------------------------------------------------------------

export function articleUrl(a: Pick<Article, 'id' | 'type'>): string {
  return a.type === 'article' ? `/article/${a.id}` : `/post/${a.id}`;
}

type StartViewTransition = (cb: () => void | Promise<void>) => void;

function startTransition(fn: () => void) {
  try {
    const doc = document as Document & {
      startViewTransition?: StartViewTransition;
    };
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => {
        fn();
      });
      return;
    }
  } catch {
    /* fallback below */
  }
  fn();
}

/** Navigate to an article/post instantly: cache card data + animate hero. */
export function openArticle(
  navigate: NavigateFunction,
  queryClient: QueryClient | null,
  article: Article,
) {
  if (queryClient) primeArticleQueries(queryClient, article);
  else setArticlePreview(article);
  startTransition(() => {
    navigate(articleUrl(article));
  });
}

/** Generic instant navigation (menu bar / any button) with transition. */
export function navigateInstant(navigate: NavigateFunction, to: string) {
  startTransition(() => {
    navigate(to);
  });
}

/** Prefetch a detail query on hover/focus so a tap opens with zero fetch. */
export function prefetchArticleDetail(
  queryClient: QueryClient,
  _articleId: number,
  fetchFull: () => Promise<unknown>,
  queryKey: readonly unknown[],
) {
  try {
    if (queryClient.getQueryData(queryKey)) return;
    void queryClient.prefetchQuery({
      queryKey,
      queryFn: fetchFull as () => Promise<unknown>,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    });
  } catch {
    /* ignore */
  }
}
