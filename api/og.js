const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
const SITE_NAME = 'تاء بوست'
const SITE_DESC = 'منصة إعلامية عربية رقمية'
const DEFAULT_OG_IMAGE = '/og-default.svg'

const BOT_UAS = [
  'facebookexternalhit', 'Facebot', 'Twitterbot', 'WhatsApp',
  'TelegramBot', 'LinkedInBot', 'RedditBot', 'Discordbot',
  'Slackbot', 'Slack-ImgProxy', 'SkypeUriPreview', 'Viber', 'ia_archiver',
]

function isBot(ua) {
  if (!ua) return false
  const lower = ua.toLowerCase()
  return BOT_UAS.some((b) => lower.includes(b.toLowerCase()))
}

function resolveImage(input, origin) {
  if (!input) return origin ? `${origin}${DEFAULT_OG_IMAGE}` : DEFAULT_OG_IMAGE
  const v = input.trim()
  if (!v) return origin ? `${origin}${DEFAULT_OG_IMAGE}` : DEFAULT_OG_IMAGE
  if (v.startsWith('data:')) return v
  let url = ''
  if (v.startsWith('http://') || v.startsWith('https://')) {
    url = v
  } else if (v.startsWith('/')) {
    url = `${origin}${v}`
  } else {
    url = `${origin}/${v.replace(/^\/+/, '')}`
  }
  if (url.includes('.supabase.co/storage/v1/object/public/')) {
    return url
      .replace('/storage/v1/object/', '/storage/v1/render/image/')
      .replace(/\?[^]*$/, '') + '?width=1200&height=630&resize=cover'
  }
  return url
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

async function fetchSiteSettings() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
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
    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch { return null }
}

async function fetchArticle(param) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
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
    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch { return null }
}

function buildOGHtml(title, description, image, url, siteName, extraTags = '') {
  const pageTitle = title ? `${title} | ${siteName}` : siteName
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
<meta property="og:image:alt" content="${esc(title || siteName)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(pageTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc(title || siteName)}">
${extraTags}
<link rel="canonical" href="${esc(url)}">
<meta http-equiv="refresh" content="0;url=${esc(url)}">
</head>
<body>
<p>Redirecting to <a href="${esc(url)}">${esc(title || siteName)}</a></p>
<script>window.location.href="${esc(url)}"</script>
</body>
</html>`
}

function extractPath(req) {
  const urlObj = new URL(req.url, `https://${req.headers.host || 'localhost'}`)
  const rawPath = urlObj.pathname
  if (rawPath.startsWith('/og/')) {
    const rest = rawPath.slice(4)
    return rest ? '/' + rest : '/'
  }
  if (rawPath.startsWith('/article/') || rawPath.startsWith('/post/')) return rawPath
  return urlObj.searchParams.get('path') || urlObj.searchParams.get('p') || '/'
}

function getOrigin(req) {
  const configured = process.env.VITE_SITE_URL || process.env.SITE_URL || ''
  if (configured) return configured.replace(/\/+$/, '')
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0]
  return `${proto}://${host}`.replace(/\/+$/, '')
}

export default async function handler(req, res) {
  try {
    const origin = getOrigin(req)
    const ua = req.headers['user-agent'] || ''
    const path = extractPath(req)

    if (!path || path === '/') {
      if (isBot(ua)) {
        const settings = await fetchSiteSettings()
        const logoOrOg = settings?.og_image || settings?.logo_url || null
        const image = resolveImage(logoOrOg, origin)
        const html = buildOGHtml('', SITE_DESC, image, origin, SITE_NAME,
          '<meta property="og:type" content="website">')
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
        return res.status(200).send(html)
      }
      return res.redirect(302, origin + '/')
    }

    const isArticle = path.startsWith('/article/')
    const isPost = path.startsWith('/post/')
    if (!isArticle && !isPost) {
      return res.redirect(302, origin + path)
    }

    const param = decodeURIComponent(path.replace(/^\/(article|post)\//, ''))
    const type = isArticle ? 'article' : 'post'

    const article = await fetchArticle(param)
    if (!article) {
      return res.redirect(302, origin + path)
    }

    if (isBot(ua)) {
      const image = resolveImage(article.image, origin)
      const articleUrl = article.id
        ? `${origin}/${type}/${article.id}`
        : `${origin}/${path.slice(1)}`
      const extraTags = [
        article.date ? `<meta property="article:published_time" content="${esc(article.date)}">` : '',
        article.type === 'article' ? '<meta property="article:section" content="مقالات">' : '',
      ].filter(Boolean).join('\n')
      const html = buildOGHtml(article.title, article.excerpt || article.title, image, articleUrl, SITE_NAME, extraTags)
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
      return res.status(200).send(html)
    }

    return res.redirect(302, origin + path)
  } catch {
    return res.redirect(302, '/')
  }
}
