const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
const SITE_URL = process.env.VITE_SITE_URL || ''
const SITE_NAME = 'تاء بوست'
const SITE_DESC = 'منصة إعلامية عربية رقمية'
const DEFAULT_OG_IMAGE = '/og-default.png'

const BOT_UAS = [
  'facebookexternalhit', 'Facebot', 'facebookcatalog', 'Twitterbot', 'WhatsApp',
  'TelegramBot', 'LinkedInBot', 'RedditBot', 'Discordbot', 'Slackbot',
  'Slack-ImgProxy', 'SkypeUriPreview', 'Viber', 'ia_archiver', 'Pinterest',
  'Instagram', 'Line', 'Applebot', 'bingbot', 'Googlebot', 'YandexBot',
  'outbrain', 'embedly', 'quora', 'showyoubot', 'tumblr', 'buffer', 'vkShare',
  'pinterestbot', 'slack-imgproxy', 'discord', 'bot', 'crawler', 'spider',
  'slurp', 'archiver', 'preview', 'embed',
]

export function isBot(ua) {
  if (!ua) return false
  const lower = ua.toLowerCase()
  return BOT_UAS.some((b) => lower.includes(b.toLowerCase()))
}

export function resolveImage(input, origin) {
  if (!input) return origin ? `${origin}${DEFAULT_OG_IMAGE}` : DEFAULT_OG_IMAGE
  const v = input.trim()
  if (!v) return origin ? `${origin}${DEFAULT_OG_IMAGE}` : DEFAULT_OG_IMAGE
  // data:/blob: URLs can never work as og:image (crawlers need an absolute
  // http(s) URL) -> fall back to the default image instead of emitting garbage.
  if (v.startsWith('data:') || v.startsWith('blob:')) {
    return origin ? `${origin}${DEFAULT_OG_IMAGE}` : DEFAULT_OG_IMAGE
  }
  let abs
  if (v.startsWith('http://') || v.startsWith('https://')) {
    abs = v
  } else if (v.startsWith('/')) {
    abs = `${origin}${v}`
  } else {
    abs = `${origin}/${v.replace(/^\/+/, '')}`
  }
  // NOTE: previously Supabase originals were routed through /api/og-image for
  // resizing, but that endpoint 500s on Vercel (FUNCTION_INVOCATION_FAILED -
  // `sharp` is not installed), which broke og:image for EVERY new article.
  // Supabase public object URLs are directly crawler-readable, so return them
  // as-is. Heavy uploads are now downscaled at upload time in the dashboard.
  // The /api/og-image endpoint is kept as a dumb passthrough fallback only.
  return abs
}

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function buildOGHtml(title, description, image, url, siteName, ogType = 'article', extraTags = '') {
  const pageTitle = title ? `${title} | ${siteName}` : siteName
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:locale" content="ar_AR">
<meta property="og:site_name" content="${esc(siteName)}">
${process.env.VITE_FB_APP_ID ? `<meta property="fb:app_id" content="${esc(process.env.VITE_FB_APP_ID)}">` : ''}
<meta property="og:type" content="${esc(ogType)}">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:type" content="${esc(image.toLowerCase().includes('.png') ? 'image/png' : image.toLowerCase().includes('.webp') ? 'image/webp' : 'image/jpeg')}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title || siteName)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(pageTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
${extraTags}
<link rel="canonical" href="${esc(url)}">
</head>
<body></body>
</html>`
}

export function getArticleParam(pathname) {
  // Strip trailing slashes, query strings and hashes so that
  // /post/42/, /post/42?utm_source=x and /post/42#x all resolve.
  const clean = String(pathname || '').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
  const postMatch = clean.match(/^\/post\/([^/]+)/)
  if (postMatch) {
    try {
      return { param: decodeURIComponent(postMatch[1]).trim(), type: 'post' }
    } catch {
      return { param: postMatch[1].trim(), type: 'post' }
    }
  }
  const articleMatch = clean.match(/^\/article\/([^/]+)/)
  if (articleMatch) {
    try {
      return { param: decodeURIComponent(articleMatch[1]).trim(), type: 'article' }
    } catch {
      return { param: articleMatch[1].trim(), type: 'article' }
    }
  }
  return null
}

export function getOrigin(request) {
  const url = new URL(request.url)
  const configuredOrigin = SITE_URL ? SITE_URL.replace(/\/+$/, '') : ''
  if (configuredOrigin) return configuredOrigin
  return `${url.protocol}//${url.host}`
}

export function getOriginFromHeaders(headers, host) {
  const configuredOrigin = SITE_URL ? SITE_URL.replace(/\/+$/, '') : ''
  if (configuredOrigin) return configuredOrigin
  const proto = (headers['x-forwarded-proto'] || 'https').split(',')[0]
  const h = (headers['x-forwarded-host'] || host || '').split(',')[0]
  return `${proto}://${h}`.replace(/\/+$/, '')
}

const cache = new Map()
const CACHE_TTL = 60_000

function getCached(key) {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data
  cache.delete(key)
  return null
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() })
  if (cache.size > 200) {
    const oldest = cache.keys().next().value
    cache.delete(oldest)
  }
}

export async function fetchSiteSettings() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  const cached = getCached('site_settings')
  if (cached !== null) return cached
  try {
    const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/site_settings?select=logo_url,og_image&limit=1`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    const result = Array.isArray(data) && data.length > 0 ? data[0] : null
    setCache('site_settings', result)
    return result
  } catch { return null }
}

export async function fetchArticle(param) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  const cacheKey = `article:${param}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached
  const isId = /^\d+$/.test(param)
  const queryParam = isId ? `id=eq.${param}` : `slug=eq.${encodeURIComponent(param)}`
  try {
    const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/articles?select=id,slug,title,excerpt,image,date,type&${queryParam}&limit=1`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    const result = Array.isArray(data) && data.length > 0 ? data[0] : null
    setCache(cacheKey, result)
    return result
  } catch { return null }
}
