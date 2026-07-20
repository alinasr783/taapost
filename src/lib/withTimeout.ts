/**
 * Races a promise against a timeout so Supabase queries fail fast instead of
 * hanging for the browser's full TCP/TLS timeout on a weak/stalled connection.
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms = 15_000,
  label = '',
): Promise<T> {
  const settled = Promise.resolve(promise)
  const timeout = new Promise<never>((_, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`انتهت مهلة الاتصال${label ? `: ${label}` : ''}`))
    }, ms)
    settled.finally(() => clearTimeout(t))
  })

  return Promise.race([settled, timeout])
}
