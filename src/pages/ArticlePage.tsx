import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowRight,
  Calendar,
  Folder,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase, type Article } from '../lib/supabase'
import { useTrackView } from '../hooks/useTrackView'
import Seo from '../components/Seo'
import ShareButton from '../components/ShareButton'

function resolveImageSrc(input: string) {
  const src = input.trim()
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
    return src
  }
  if (src.startsWith('/') && typeof window !== 'undefined') {
    return `${window.location.origin}${src}`
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/${src.replace(/^\/+/, '')}`
  }
  return src
}

const ARTICLE_STYLE = `
  .article-body {
    --article-font-size: 1.125rem;
    font-size: var(--article-font-size);
    overflow: hidden !important;
    line-height: 2;
    color: hsl(var(--foreground));
    direction: rtl;
    text-align: right;
  }
  .article-body * {
    word-break: normal !important;
    overflow-wrap: break-word !important;
    white-space: normal !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    font-size: inherit !important;
  }
  .article-body h1, .article-body h2, .article-body h3, .article-body h4 {
    font-weight: 700;
    color: hsl(var(--primary));
    margin: 1.5em 0 0.5em;
    line-height: 1.4;
  }
  .article-body h1 { font-size: 2em !important; }
  .article-body h2 { font-size: 1.5em !important; }
  .article-body h3 { font-size: 1.25em !important; }
  .article-body h4 { font-size: 1.125em !important; }
  .article-body p {
    margin: 0 0 1em;
    color: hsl(var(--foreground));
    opacity: 0.9;
  }
  .article-body a {
    color: hsl(var(--primary));
    text-decoration: none;
  }
  .article-body a:hover { text-decoration: underline; }
  .article-body img {
    max-width: 100%;
    height: auto;
    border-radius: 5px;
    display: block;
    margin: 1.5em 0;
  }
  .article-body blockquote {
    border-right: 4px solid hsl(var(--primary));
    background: hsl(var(--primary) / 0.05);
    margin: 1.5em 0;
    padding: 0.5em 1em;
    border-radius: 0 4px 4px 0;
  }
  .article-body ul, .article-body ol {
    margin: 0 0 1em;
    padding-right: 1.5em;
  }
  .article-body li { margin-bottom: 0.25em; }
  .article-body strong { font-weight: 700; color: hsl(var(--foreground)); }
  .article-body table {
    display: block;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
    margin: 1em 0;
  }
  .article-body td, .article-body th {
    border: 1px solid hsl(var(--border));
    padding: 0.5em 0.75em;
    color: hsl(var(--foreground));
  }
  .article-body pre {
    max-width: 100%;
    overflow-x: auto;
    white-space: pre-wrap !important;
    background: hsl(var(--muted));
    padding: 1em;
    border-radius: 5px;
    font-size: 0.875rem;
    color: hsl(var(--foreground));
  }
  .article-body code {
    word-break: break-word !important;
    white-space: pre-wrap !important;
    color: hsl(var(--foreground));
  }
  .article-body iframe { max-width: 100%; }
  .article-body .ql-video-wrapper {
    position: relative !important;
    padding-bottom: 56.25% !important;
    height: 0 !important;
    overflow: hidden !important;
    max-width: 100% !important;
    margin: 1.5em 0 !important;
  }
  .article-body .ql-video-wrapper .ql-video {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    border: 0 !important;
  }
  .article-body .ql-video {
    max-width: 100%;
    aspect-ratio: 16 / 9;
    width: 100%;
    height: auto;
  }
  .article-body figure { max-width: 100%; margin: 1.5em 0; }
  .article-body figcaption { font-size: 0.875rem; opacity: 0.7; margin-top: 0.5em; text-align: center; color: hsl(var(--foreground)); }
` as const

export default function ArticlePage() {
  const { id, slug } = useParams()
  const navigate = useNavigate()
  const routeArticleId = id && /^\d+$/.test(id) ? Number(id) : null
  const routeSlugFromId = id && !/^\d+$/.test(id) ? decodeURIComponent(id) : ''
  const routeSlug = slug ? decodeURIComponent(slug) : routeSlugFromId

  const articleQueryKey = useMemo(() => {
    if (routeArticleId) return { type: 'id' as const, value: routeArticleId }
    if (routeSlug) return { type: 'slug' as const, value: routeSlug }
    return null
  }, [routeArticleId, routeSlug])

  const articleQuery = useQuery({
    queryKey: ['article_page', articleQueryKey],
    queryFn: async () => {
      if (!articleQueryKey) return { article: null as Article | null, toc: [], related: [], redirectToId: null as number | null }

      const baseQuery = supabase
        .from('articles')
        .select('*, categories(name), authors(id, name, image, bio, role)')

      const { data, error } =
        articleQueryKey.type === 'id'
          ? await baseQuery.eq('id', articleQueryKey.value).single()
          : await baseQuery.eq('slug', articleQueryKey.value).single()

      if (error) {
        console.error('[ArticlePage] Supabase error:', error)
        throw error
      }

      if (!data) {
        console.warn('[ArticlePage] No article data found for:', articleQueryKey)
        return { article: null as Article | null, toc: [], related: [], redirectToId: null as number | null, redirectToArticle: null as string | null }
      }

      if (data.type === 'article') {
        const target = data.slug ? `/article/${encodeURIComponent(data.slug)}` : `/article/${data.id}`
        return { article: null as Article | null, toc: [], related: [], redirectToId: null as number | null, redirectToArticle: target }
      }

      if (articleQueryKey.type === 'slug') {
        return { article: data as Article, toc: [], related: [], redirectToId: Number(data.id), redirectToArticle: null }
      }

      if (!data.content) {
        console.warn('[ArticlePage] Article content is empty/null for article ID:', data.id, 'title:', data.title)
      }

      let contentHtml = ''

      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(data.content || '', 'text/html')

        const blockedStyleProps = new Set([
          'word-break', 'overflow-wrap', 'white-space', 'word-wrap',
          'width', 'min-width', 'max-width',
          'position', 'left', 'right', 'float',
          'margin-left', 'margin-right',
        ])

        doc.body.querySelectorAll('*').forEach((el) => {
          const style = el.getAttribute('style')
          if (style) {
            const cleaned = style
              .split(';')
              .map((s) => s.trim())
              .filter((s) => s && !blockedStyleProps.has(s.split(':')[0]?.trim().toLowerCase()))
              .join('; ')
            if (cleaned) {
              el.setAttribute('style', cleaned)
            } else {
              el.removeAttribute('style')
            }
          }
          if ((el as HTMLElement).dir) (el as HTMLElement).dir = ''

          const tag = el.tagName
          if (tag === 'IMG' || tag === 'TABLE' || tag === 'IFRAME') {
            el.setAttribute('style', (el.getAttribute('style') || '') + ';max-width:100%')
          }
        })

        const processedHtml = doc.body.innerHTML.replace(/&nbsp;/gi, ' ').replace(/\u00A0/g, ' ')

        const youTubeMarkerRegex = /\{\{youtube:([a-zA-Z0-9_-]{11})\}\}/g
        contentHtml = processedHtml.replace(youTubeMarkerRegex, (_match: string, videoId: string) => {
          const embedUrl = `https://www.youtube.com/embed/${videoId}`
          return `<div class="ql-video-wrapper" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;margin:1.5em 0;"><iframe class="ql-video" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
        })
      } catch (err) {
        console.error('[ArticlePage] Error processing article content HTML:', err)
        contentHtml = data.content || ''
      }

      const h2s = (() => {
        try {
          const parser = new DOMParser()
          const doc = parser.parseFromString(data.content || '', 'text/html')
          return doc.querySelectorAll('h2')
        } catch {
          return [] as NodeListOf<HTMLHeadingElement>
        }
      })()
      const toc: { id: string; text: string }[] = []
      h2s.forEach((h2, index) => {
        const id = `section-${index}`
        h2.id = id
        toc.push({ id, text: h2.textContent || '' })
      })

      const authorData = Array.isArray(data.authors)
        ? (data.authors.length > 0 ? data.authors[0] : null)
        : data.authors

      if (!authorData) {
        console.warn('[ArticlePage] No author data found for article ID:', data.id)
      }

      const article: Article = {
        ...(data as Article),
        category: (Array.isArray(data.categories) ? data.categories[0]?.name : data.categories?.name) || '',
        authors: authorData,
        contentHtml: contentHtml,
      } as Article

      let related: Article[] = []
      try {
        const { data: relatedData } = await supabase
          .from('articles')
          .select('id, slug, title, image, date, category_id, excerpt, is_exclusive')
          .eq('category_id', data.category_id)
          .neq('id', data.id)
          .limit(5)
          .order('date', { ascending: false })
        related = (relatedData ?? []) as Article[]
      } catch (err) {
        console.error('[ArticlePage] Error fetching related articles:', err)
      }

      return {
        article,
        toc,
        related,
        redirectToId: null as number | null,
        redirectToArticle: null as string | null,
      }
    },
    enabled: Boolean(articleQueryKey),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  })

  const buildArticleUrl = (article: Article | null) => {
    if (!article) return ''
    if (article.slug) return `/post/${encodeURIComponent(article.slug)}`
    return `/post/${article.id}`
  }

  const buildContentUrl = (a: Article) => {
    const p = a.slug ? `/post/${encodeURIComponent(a.slug)}` : `/post/${a.id}`
    return p
  }

  useEffect(() => {
    const redirectToArticle = articleQuery.data?.redirectToArticle
    if (redirectToArticle) {
      if (decodeURIComponent(window.location.pathname).replace(/\/+$/, '') === redirectToArticle.replace(/\/+$/, '')) return
      navigate(redirectToArticle, { replace: true })
      return
    }
    const redirectToId = articleQuery.data?.redirectToId
    const article = articleQuery.data?.article
    if (!redirectToId || !article) return
    const target = article.slug ? `/post/${encodeURIComponent(article.slug)}` : `/post/${redirectToId}`
    if (decodeURIComponent(window.location.pathname).replace(/\/+$/, '') === target.replace(/\/+$/, '')) return
    navigate(target, { replace: true })
  }, [articleQuery.data?.redirectToArticle, articleQuery.data?.redirectToId, articleQuery.data?.article, navigate])

  const article = articleQuery.data?.article ?? null
  const relatedArticles = articleQuery.data?.related ?? []
  useTrackView(article?.id || 0)

  const [fontSize, setFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem('article_font_size')
      return saved ? Number(saved) : 1.125
    } catch {
      return 1.125
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('article_font_size', String(fontSize))
    } catch { /* ignore */ }
  }, [fontSize])

  const [authorArticlesShowCount, setAuthorArticlesShowCount] = useState(6)
  const authorId = article?.authors?.id

  const authorArticlesQuery = useQuery({
    queryKey: ['author_articles', authorId],
    queryFn: async () => {
      if (!authorId) return [] as Article[]
      const { data, error } = await supabase
        .from('articles')
        .select('id, slug, title, image, date, excerpt, is_exclusive')
        .eq('author_id', authorId)
        .order('date', { ascending: false })
        .limit(6)
      if (error) {
        console.error('[ArticlePage] Error fetching author articles:', error)
        throw error
      }
      return (data ?? []) as Article[]
    },
    enabled: Boolean(authorId),
    staleTime: 5 * 60_000,
  })

  const authorArticles = authorArticlesQuery.data ?? []
  const visibleAuthorArticles = authorArticles.filter(a => a.id !== article?.id).slice(0, authorArticlesShowCount)
  const hasMoreAuthorArticles = authorArticles.filter(a => a.id !== article?.id).length > authorArticlesShowCount

  const calculateReadingTime = (content: string) => {
    const text = content.replace(/<[^>]*>/g, '')
    const wordsPerMinute = 200
    const words = text.trim().split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return `${minutes} دقيقة قراءة`
  }

  if (articleQuery.isLoading) {
    return (
    <div className="container max-w-7xl py-4 md:py-8 lg:py-12">
        <div className="space-y-6">
          <div className="h-8 w-40 rounded bg-muted/40 animate-pulse" />
          <div className="h-[280px] w-full rounded-lg bg-muted/40 animate-pulse" />
          <div className="space-y-3">
            <div className="h-6 w-5/6 rounded bg-muted/50 animate-pulse" />
            <div className="h-4 w-4/6 rounded bg-muted/40 animate-pulse" />
            <div className="h-4 w-3/6 rounded bg-muted/40 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (articleQuery.error) {
    const errorMessage = articleQuery.error instanceof Error ? articleQuery.error.message : 'حدث خطأ غير معروف'
    return (
      <div className="container flex flex-col items-center justify-center py-20 text-center">
        <Seo title="خطأ في تحميل المقال" description="حدث خطأ أثناء تحميل المقال" robots="noindex,follow" />
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 max-w-lg">
          <h2 className="mb-2 text-xl font-bold text-destructive">حدث خطأ أثناء تحميل المقال</h2>
          <p className="mb-4 text-sm text-muted-foreground">يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية</p>
          <div className="mb-4 rounded bg-background/80 p-3 text-left text-xs text-muted-foreground font-mono overflow-auto max-h-24">
            {errorMessage}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => articleQuery.refetch()}
              className="rounded-[5px] bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => navigate('/')}
              className="rounded-[5px] border border-border px-5 py-2 text-sm text-muted-foreground hover:bg-muted/50"
            >
              العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="container flex flex-col items-center justify-center py-20 text-center">
        <Seo title="المقال غير موجود" description="عذراً، هذا المقال غير موجود" robots="noindex,follow" />
        <h2 className="mb-4 text-2xl font-bold text-foreground">عذراً، المقال غير موجود</h2>
        <button 
          onClick={() => navigate('/')}
          className="rounded-[5px] bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90"
        >
          العودة للرئيسية
        </button>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl py-4 md:py-8 lg:py-12">
      <Seo
        title={article.title}
        description={article.excerpt || article.title}
        canonicalPath={article.slug ? `/post/${encodeURIComponent(article.slug)}` : `/post/${article.id}`}
        ogType="website"
        image={article.image}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: article.title,
          description: article.excerpt || '',
          datePublished: article.date || '',
          image: article.image ? [{ '@type': 'ImageObject', url: article.image }] : undefined,
          inLanguage: 'ar',
        }}
      />
      <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4 md:mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[13px] sm:text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          <span>عودة</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <span className="flex items-center gap-1 rounded-[5px] bg-primary text-primary-foreground px-2 sm:px-3 py-0.5 sm:py-1 font-medium shadow-sm whitespace-nowrap">
            <Folder className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {article.category}
          </span>
          {article.is_exclusive ? (
            <span className="flex items-center gap-1 rounded-[5px] bg-red-600/10 px-2 sm:px-3 py-0.5 sm:py-1 text-red-600 font-bold border border-red-600/20 whitespace-nowrap">
              حصرياً
            </span>
          ) : (
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {new Date(article.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          )}
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="i-lucide-clock h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {calculateReadingTime(article.content || '')}
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-3 md:space-y-4 text-center md:text-right mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl text-foreground">
          {article.title}
        </h1>
        {article.content_source && (
          <p className="text-sm font-bold text-red-600">
            {article.content_source}
          </p>
        )}
      </div>

      {/* Featured Image (Full Width) */}
      <div className="relative overflow-hidden rounded-[5px] shadow-lg mb-4 md:mb-8">
        <img 
          src={article.image} 
          alt={article.title} 
          className="w-full object-cover max-h-[300px] sm:max-h-[400px] md:max-h-[600px]"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          width={1200}
          height={600}
        />
      </div>

      <div className="grid grid-cols-1 gap-8">

        {/* Main Content */}
        <article className="space-y-8 min-w-0 overflow-hidden w-full">
          {/* Article Text */}
          <style dangerouslySetInnerHTML={{ __html: ARTICLE_STYLE }} />

          <section className="rounded-[5px] border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden relative">
            <div className="border-b border-border/40 px-4 sm:px-6 md:px-10 py-3 flex items-center">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
                <button
                  onClick={() => setFontSize(prev => Math.min(prev + 0.125, 2))}
                  disabled={fontSize >= 2}
                  className="inline-flex items-center gap-1 rounded-[5px] border px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed border-border/60 bg-background/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5"
                  title="تكبير الخط"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">تكبير</span>
                </button>
                <button
                  onClick={() => setFontSize(prev => Math.max(prev - 0.125, 1))}
                  disabled={fontSize <= 1}
                  className="inline-flex items-center gap-1 rounded-[5px] border px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed border-border/60 bg-background/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5"
                  title="تصغير الخط"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">تصغير</span>
                </button>
                <button
                  onClick={() => setFontSize(1.125)}
                  disabled={fontSize === 1.125}
                  className="inline-flex items-center gap-1 rounded-[5px] border px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed border-border/60 bg-background/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5"
                  title="إعادة ضبط الخط"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">إعادة ضبط</span>
                </button>
              </div>
            </div>
            <div
              className="article-body w-full p-4 sm:p-6 md:p-10"
              lang="ar"
              style={{ '--article-font-size': `${fontSize}rem` } as React.CSSProperties}
              dangerouslySetInnerHTML={{ __html: article.contentHtml || '' }}
            />
          </section>

          {article.authors && article.authors.name && (
            <Link
              to={`/author/${article.authors.id}`}
              className="rounded-[5px] border border-border/40 bg-card/50 p-6 backdrop-blur-sm flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-right hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
                {article.authors.image ? (
                  <img src={article.authors.image} alt={article.authors.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                    {article.authors.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-2 justify-center md:justify-start">
                  <h3 className="text-xl font-bold text-foreground hover:text-primary transition-colors">{article.authors.name}</h3>
                  {article.authors.role && <span className="text-sm text-primary bg-primary/10 px-2 py-0.5 rounded-full">{article.authors.role}</span>}
                </div>
                <p className="text-muted-foreground">{article.authors.bio}</p>
              </div>
            </Link>
          )}

          {/* Read more from same author */}
          {authorArticles.length > 1 && article.authors && (
            <section className="rounded-[5px] border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="border-b border-border/40 px-4 sm:px-6 md:px-10 py-3">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  اقرأ لنفس الكاتب
                </h2>
              </div>
              <div className="p-4 sm:p-6 md:p-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {visibleAuthorArticles.map((authArticle) => (
                    <Link
                      key={authArticle.id}
                      to={buildContentUrl(authArticle)}
                      className="group rounded-[5px] border border-border/40 bg-background/50 overflow-hidden hover:border-primary/30 hover:shadow-md transition-all"
                    >
                      <div className="relative h-40 w-full overflow-hidden">
                        <img
                          src={authArticle.image || ''}
                          alt={authArticle.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                          width={400}
                          height={160}
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        {authArticle.is_exclusive && (
                          <div className="absolute right-2 top-2 rounded-[5px] border border-white/30 bg-red-600/80 px-2 py-1 text-[10px] text-white/90 backdrop-blur font-bold">
                            حصرياً
                          </div>
                        )}
                        <div className="absolute inset-x-2 bottom-2">
                          <div className="line-clamp-2 text-sm font-semibold text-white">
                            {authArticle.title}
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="line-clamp-2 text-xs text-muted-foreground">
                          {authArticle.excerpt}
                        </div>
                        {authArticle.date && (
                          <div className="mt-2 text-[10px] text-muted-foreground/70">
                            {new Date(authArticle.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
                {hasMoreAuthorArticles && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setAuthorArticlesShowCount(prev => prev + 6)}
                      className="inline-flex items-center gap-2 rounded-[5px] border border-primary/30 bg-primary/5 px-6 py-2.5 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      عرض المزيد
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="border-t border-border/40 pt-8 mt-8">
            <ShareButton
              url={`${window.location.origin}${buildArticleUrl(article)}`}
              title={article.title}
              description={article.excerpt}
            />
          </div>
        </article>
      </div>

      {/* Related Articles Section */}
      {relatedArticles.length > 0 && (
        <section className="mt-16 border-t border-border/40 pt-10">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <span className="w-1 h-8 bg-primary rounded-full"/>
            اقرأ أيضاً
          </h2>
          <div className="overflow-x-auto">
            <div className="flex gap-7 pb-4">
              {relatedArticles.map((related) => (
                <Link 
                  key={related.id} 
                  to={buildContentUrl(related)}
                  className="relative flex min-w-[360px] max-w-[480px] flex-col overflow-hidden rounded-[5px] border border-white/10 bg-black/30 text-right shadow-sm backdrop-blur-md group"
                >
                  <div className="relative h-56 w-full">
                    <img 
                      src={resolveImageSrc(related.image ?? '')} 
                      alt={related.title} 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                      width={480}
                      height={224}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                    {related.is_exclusive && (
                      <div className="absolute right-2 top-2 rounded-[5px] border border-white/30 bg-red-600/80 px-2 py-1 text-[11px] text-white/90 backdrop-blur font-bold">
                        حصرياً
                      </div>
                    )}
                    <div className="absolute inset-x-2 bottom-2">
                      <div className="space-y-1 rounded-[5px] border border-white/20 bg-black/50 px-3 py-2 text-white backdrop-blur-md">
                        <div className="line-clamp-2 text-sm font-semibold">
                          {related.title}
                        </div>
                        <div className="line-clamp-2 text-[11px] text-white/85">
                          {related.excerpt}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
