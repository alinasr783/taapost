import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * Wraps React.lazy so that a failed dynamic import (e.g. a dropped JS chunk on
 * a weak network) is retried with exponential backoff instead of permanently
 * unmounting the React tree (which would leave a blank white screen).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
): LazyExoticComponent<T> {
  return lazy(() => {
    const attempt = (remaining: number): Promise<{ default: T }> =>
      factory().catch((err) => {
        if (remaining <= 0) throw err
        const delay = 1500 * (retries - remaining + 1)
        return new Promise((resolve) => setTimeout(resolve, delay)).then(() =>
          attempt(remaining - 1),
        )
      })
    return attempt(retries)
  })
}
