import { isBot, resolveImage, buildOGHtml, esc, getArticleParam, getOrigin, fetchSiteSettings, fetchArticle } from './middleware-utils.js'

const SITE_NAME = 'تاء بوست'
const SITE_DESC = 'منصة إعلامية عربية رقمية'

export default async function middleware(request) {
  const url = new URL(request.url)
  const { pathname } = url
  const ua = request.headers.get('user-agent') || ''
  const origin = getOrigin(request)

  if (pathname === '/' || pathname === '') {
    if (isBot(ua)) {
      const settings = await fetchSiteSettings()
      const logoOrOg = settings?.og_image || settings?.logo_url || null
      const image = resolveImage(logoOrOg, origin)
      const html = buildOGHtml('', SITE_DESC, image, origin, SITE_NAME, 'website')
      return new Response(html, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
        },
      })
    }
    return
  }

  const articleInfo = getArticleParam(pathname)
  if (!articleInfo) return

  if (isBot(ua)) {
    const article = await fetchArticle(articleInfo.param)
    if (!article) return
    const image = resolveImage(article.image, origin)
    const type = articleInfo.type
    const articleUrl = article.id
      ? `${origin}/${type}/${article.id}`
      : `${origin}/${pathname.slice(1)}`
    const extraTags = article.date
      ? `<meta property="article:published_time" content="${esc(article.date)}">`
      : ''
    const html = buildOGHtml(article.title, article.excerpt || article.title, image, articleUrl, SITE_NAME, 'article', extraTags)
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  }

  const isId = /^\d+$/.test(articleInfo.param)
  if (!isId) {
    const article = await fetchArticle(articleInfo.param)
    if (!article) return
    const newPath = article.type === 'article' ? `/article/${article.id}` : `/post/${article.id}`
    return new Response(null, {
      status: 301,
      headers: {
        'location': `${origin}${newPath}`,
        'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  }

  return
}

export const config = {
  matcher: ['/', '/article/:path*', '/post/:path*'],
}
