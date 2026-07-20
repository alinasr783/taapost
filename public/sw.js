const CACHE = 'taapost-v2'
const PRECACHE_URLS = ['/', '/articles', '/categories']
const ASSET_RE = /\.(js|css|png|jpeg|jpg|gif|svg|ico|woff2?|ttf|eot)$/
const API_TIMEOUT = 8000
const API_MAX_AGE = 5 * 60 * 1000 // 5 minutes

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Never let a single failing precache URL abort the whole install.
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url).catch(() => {}))),
    ),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim()
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      // Drop stale API responses so we never serve long-outdated data.
      const apiCache = await caches.open(CACHE)
      const requests = await apiCache.keys()
      await Promise.all(
        requests.map(async (req) => {
          const res = await apiCache.match(req)
          const dateHeader = res && res.headers.get('date')
          if (res && dateHeader && Date.now() - Date.parse(dateHeader) > API_MAX_AGE) {
            await apiCache.delete(req)
          }
        }),
      )
    })(),
  )
})

// Stale-while-revalidate for static assets. NEVER returns a synthetic 503 for
// app assets: if the network fails we return the cached copy, and only if there
// is no cache do we let the real network error surface.
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone())
      return res
    })
    .catch(() => cached)
  return cached || network || (await network.catch(() => fetch(request)))
}

// Network-first with a timeout and a cached fallback for navigations / API.
async function networkFirst(request: Request, timeout: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(request, { signal: controller.signal })
    clearTimeout(timer)
    if (res && res.ok) {
      const cache = await caches.open(CACHE)
      cache.put(request, res.clone())
    }
    return res
  } catch {
    clearTimeout(timer)
    const cache = await caches.open(CACHE)
    const cached = await cache.match(request)
    return cached || Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_TIMEOUT))
    return
  }

  if (url.pathname.startsWith('/dashboard')) {
    event.respondWith(fetch(request))
    return
  }

  // Supabase REST API: network-first with a short timeout + cache fallback.
  if (url.origin.includes('supabase.co') && url.pathname.includes('/rest')) {
    event.respondWith(networkFirst(request, API_TIMEOUT))
    return
  }

  if (ASSET_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // HTML navigations: network-first, fall back to the cached app shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, API_TIMEOUT).catch(async () => {
        const cache = await caches.open(CACHE)
        return (await cache.match('/')) || Response.error()
      }),
    )
    return
  }

  event.respondWith(fetch(request))
})
