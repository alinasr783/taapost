const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
const SITE_URL = process.env.VITE_SITE_URL || ''
const SITE_NAME = 'تاء بوست'
const SITE_DESC = 'منصة إعلامية عربية رقمية'
const DEFAULT_OG_IMAGE = '/og-default.svg'

const BOT_UAS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'WhatsApp',
  'TelegramBot',
  'LinkedInBot',
  'RedditBot',
  'Discordbot',
  'Slackbot',
  'Slack-ImgProxy',
  'SkypeUriPreview',
  'Viber',
  'ia_archiver',
]

function isBot(ua) {
  if (!ua) return false
  const lower = ua.toLowerCase()
  return BOT_UAS.some((b) => lower.includes(b.toLowerCase()))
}

function resolveImage(input, origin) {
  if (!input) return origin ? `${origin}${DEFAULT_OG_IMAGE}` : DEFAULT_OG_IMAGE
  const v = input.trim()
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:') || v.startsWith('blob:')) return v
  if (v.startsWith('/')) return `${origin}${v}`
  return `${origin}/${v.replace(/^\/+/, '')}`
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function ogHtml(article, origin, siteName) {
  const title = article.title || ''
  const description = article.excerpt || article.title || ''
  const image = resolveImage(article.image, origin)
  const url = article.slug
    ? `${origin}/post/${encodeURIComponent(article.slug)}`
    : `${origin}/post/${article.id}`
  const pageTitle = `${title} | ${siteName}`

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:locale" content="ar_AR">
<meta property="og:site_name" content="${esc(siteName)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(pageTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="canonical" href="${esc(url)}">
<meta http-equiv="refresh" content="0;url=${esc(url)}">
</head>
<body>
<script>window.location.href="${esc(url)}"</script>
</body>
</html>`
}

async function fetchArticle(param) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null

  const isId = /^\d+$/.test(param)
  const queryParam = isId ? `id=eq.${param}` : `slug=eq.${encodeURIComponent(param)}`
  const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/articles?select=id,slug,title,excerpt,image,date&${queryParam}&limit=1`
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json',
  }

  try {
    const res = await fetch(url, { headers })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    return data[0]
  } catch {
    return null
  }
}

function getOrigin(request) {
  const url = new URL(request.url)
  const configuredOrigin = SITE_URL ? SITE_URL.replace(/\/+$/, '') : ''
  if (configuredOrigin) return configuredOrigin
  return `${url.protocol}//${url.host}`
}

function getArticleParam(pathname) {
  const postMatch = pathname.match(/^\/post\/([^/]+)/)
  if (postMatch) return { param: decodeURIComponent(postMatch[1]), type: 'post' }
  const arabicMatch = pathname.match(/^\/\u0645\u0642\u0627\u0644\/([^/]+)/)
  if (arabicMatch) return { param: decodeURIComponent(arabicMatch[1]), type: 'arabic' }
  return null
}

export default async function middleware(request) {
  const { pathname } = new URL(request.url)
  const articleInfo = getArticleParam(pathname)
  if (!articleInfo) return

  const ua = request.headers.get('user-agent') || ''
  if (!isBot(ua)) return

  const article = await fetchArticle(articleInfo.param)
  if (!article) return

  const origin = getOrigin(request)
  const html = ogHtml(article, origin, SITE_NAME)
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}

export const config = {
  matcher: ['/post/:path*', '/مقال/:path*'],
}
