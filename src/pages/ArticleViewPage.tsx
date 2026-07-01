import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Calendar, User, ZoomIn, ZoomOut, RotateCcw, Clock, BookOpen } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase, type Article } from '../lib/supabase'
import Seo from '../components/Seo'
import ShareButton from '../components/ShareButton'

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
  .article-body a { color: hsl(var(--primary)); text-decoration: none; }
  .article-body a:hover { text-decoration: underline; }
  .article-body img { max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 1.5em 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .article-body blockquote {
    border-right: 4px solid hsl(var(--primary));
    background: hsl(var(--primary) / 0.05);
    margin: 1.5em 0;
    padding: 0.5em 1em;
    border-radius: 0 8px 8px 0;
  }
  .article-body ul, .article-body ol { margin: 0 0 1em; padding-right: 1.5em; }
  .article-body li { margin-bottom: 0.25em; }
  .article-body strong { font-weight: 700; color: hsl(var(--foreground)); }
  .article-body table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; margin: 1em 0; }
  .article-body td, .article-body th { border: 1px solid hsl(var(--border)); padding: 0.5em 0.75em; color: hsl(var(--foreground)); }
  .article-body pre { max-width: 100%; overflow-x: auto; white-space: pre-wrap !important; background: hsl(var(--muted)); padding: 1em; border-radius: 8px; font-size: 0.875rem; color: hsl(var(--foreground)); }
  .article-body code { word-break: break-word !important; white-space: pre-wrap !important; color: hsl(var(--foreground)); }
  .article-body iframe { max-width: 100%; border-radius: 8px; }
  .article-body .ql-video-wrapper { position: relative !important; padding-bottom: 56.25% !important; height: 0 !important; overflow: hidden !important; max-width: 100% !important; margin: 1.5em 0 !important; border-radius: 8px; }
  .article-body .ql-video-wrapper .ql-video { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; border: 0 !important; }
  .article-body .ql-video { max-width: 100%; aspect-ratio: 16 / 9; width: 100%; height: auto; }
  .article-body figure { max-width: 100%; margin: 1.5em 0; }
  .article-body figcaption { font-size: 0.875rem; opacity: 0.7; margin-top: 0.5em; text-align: center; color: hsl(var(--foreground)); }
`

export default function ArticleViewPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const decodedSlug = slug ? decodeURIComponent(slug) : ''

  const articleQuery = useQuery({
    queryKey: ['article_view', decodedSlug],
    queryFn: async () => {
      if (!decodedSlug) return { article: null as Article | null, related: [] as Article[], error: null as string | null }

      let data: unknown
      const isNumeric = /^\d+$/.test(decodedSlug)

      if (isNumeric) {
        const res = await supabase
          .from('articles')
          .select('*, categories(name), authors(id, name, image, bio, role)')
          .eq('id', Number(decodedSlug))
          .eq('type', 'article')
          .single()
        data = res.data
        if (res.error) return { article: null, related: [], error: res.error.message }
      } else {
        const res = await supabase
          .from('articles')
          .select('*, categories(name), authors(id, name, image, bio, role)')
          .eq('slug', decodedSlug)
          .eq('type', 'article')
          .single()
        data = res.data
        if (res.error) return { article: null, related: [], error: res.error.message }
      }

      if (!data) return { article: null as Article | null, related: [], error: 'المقال غير موجود' }

      let contentHtml = ''
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString((data as Record<string, unknown>).content as string || '', 'text/html')

        const blockedStyleProps = new Set([
          'word-break', 'overflow-wrap', 'white-space', 'word-wrap',
          'width', 'min-width', 'max-width', 'position', 'left', 'right', 'float',
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
            if (cleaned) el.setAttribute('style', cleaned)
            else el.removeAttribute('style')
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
      } catch {
        contentHtml = (data as Record<string, unknown>).content as string || ''
      }

      const authorData = Array.isArray((data as Record<string, unknown>).authors)
        ? ((data as Record<string, unknown>).authors as Array<Record<string, unknown>>).length > 0 ? (data as Record<string, unknown>).authors[0] : null
        : (data as Record<string, unknown>).authors

      const article: Article = {
        ...(data as Article),
        category: (Array.isArray((data as Record<string, unknown>).categories)
          ? ((data as Record<string, unknown>).categories as Array<Record<string, unknown>>)[0]?.name as string
          : ((data as Record<string, unknown>).categories as Record<string, unknown>)?.name as string) || '',
        authors: authorData as Article['authors'],
        contentHtml,
      } as Article

      const { data: relatedData } = await supabase
        .from('articles')
        .select('id, slug, title, image, date, category_id, excerpt, is_exclusive')
        .eq('category_id', article.category_id)
        .eq('type', 'article')
        .neq('id', article.id)
        .limit(5)
        .order('date', { ascending: false })

      return { article, related: (relatedData ?? []) as Article[], error: null }
    },
    enabled: Boolean(decodedSlug),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  })

  const article = articleQuery.data?.article ?? null
  const relatedArticles = articleQuery.data?.related ?? []

  const [fontSize, setFontSize] = useState(() => {
    try { const saved = localStorage.getItem('article_font_size'); return saved ? Number(saved) : 1.125 }
    catch { return 1.125 }
  })

  useEffect(() => {
    try { localStorage.setItem('article_font_size', String(fontSize)) } catch { }
  }, [fontSize])

  const calculateReadingTime = (content: string) => {
    const text = content.replace(/<[^>]*>/g, '')
    const wordsPerMinute = 200
    const words = text.trim().split(/\s+/).length
    return `${Math.ceil(words / wordsPerMinute)} دقيقة قراءة`
  }

  const buildArticleUrl = (a: Article) => {
    if (a.slug) return `/article/${encodeURIComponent(a.slug)}`
    return `/article/${a.id}`
  }

  if (articleQuery.isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="space-y-6">
          <div className="h-6 w-32 rounded bg-muted/40 animate-pulse" />
          <div className="h-[400px] w-full rounded-2xl bg-muted/40 animate-pulse" />
          <div className="space-y-3">
            <div className="h-8 w-5/6 rounded bg-muted/50 animate-pulse" />
            <div className="h-4 w-4/6 rounded bg-muted/40 animate-pulse" />
            <div className="h-4 w-3/6 rounded bg-muted/40 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (articleQuery.error || (!article && articleQuery.data?.error)) {
    const errorMessage = articleQuery.error instanceof Error ? articleQuery.error.message : (articleQuery.data?.error || 'حدث خطأ غير معروف')
    return (
      <div className="container flex flex-col items-center justify-center py-20 text-center">
        <Seo title="خطأ في تحميل المقال" description="حدث خطأ أثناء تحميل المقال" robots="noindex,follow" />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 max-w-lg">
          <h2 className="mb-2 text-xl font-bold text-destructive">حدث خطأ أثناء تحميل المقال</h2>
          <p className="mb-6 text-sm text-muted-foreground">يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => articleQuery.refetch()} className="rounded-xl bg-primary px-6 py-2.5 text-sm text-primary-foreground hover:bg-primary/90">
              إعادة المحاولة
            </button>
            <button onClick={() => navigate('/')} className="rounded-xl border border-border px-6 py-2.5 text-sm text-muted-foreground hover:bg-muted/50">
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
        <BookOpen className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="mb-4 text-2xl font-bold text-foreground">عذراً، المقال غير موجود</h2>
        <button onClick={() => navigate('/')} className="rounded-xl bg-primary px-6 py-2.5 text-primary-foreground hover:bg-primary/90">
          العودة للرئيسية
        </button>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <Seo
        title={article.title}
        description={article.excerpt || article.title}
        canonicalPath={`/article/${encodeURIComponent(article.slug || String(article.id))}`}
        ogType="article"
        image={article.image}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.excerpt || '',
          datePublished: article.date || '',
          image: article.image ? [{ '@type': 'ImageObject', url: article.image }] : undefined,
          author: article.authors?.name ? { '@type': 'Person', name: article.authors.name } : undefined,
          inLanguage: 'ar',
        }}
      />

      {/* Back button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowRight className="h-4 w-4" />
        عودة
      </button>

      {/* Article Header */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
            {article.category || 'غير مصنف'}
          </span>
          {article.is_exclusive && (
            <span className="bg-red-600/10 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-600/20">
              حصرياً
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
          {article.title}
        </h1>

        {article.excerpt && (
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            {article.excerpt}
          </p>
        )}

        {article.content_source && (
          <p className="text-sm font-bold text-red-600">{article.content_source}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2">
          {article.authors && (
            <Link to={`/author/${article.authors.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                {article.authors.image ? (
                  <img src={article.authors.image} alt={article.authors.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-primary" />
                )}
              </div>
              <div>
                <span className="font-medium text-foreground block">{article.authors.name}</span>
                {article.authors.role && <span className="text-xs text-muted-foreground">{article.authors.role}</span>}
              </div>
            </Link>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar size={16} />
            {new Date(article.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={16} />
            {calculateReadingTime(article.content || '')}
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {article.image && (
        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-10">
          <img
            src={article.image}
            alt={article.title}
            className="w-full object-cover max-h-[500px]"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            width={1200}
            height={600}
          />
        </div>
      )}

      {/* Content */}
      <article className="space-y-8">
        <div className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
          <div className="border-b border-border/40 px-6 py-3 flex items-center gap-2">
            <ZoomIn size={16} />
            <span className="text-sm text-muted-foreground">تحكم في حجم الخط:</span>
            <div className="flex items-center gap-1.5 mr-auto">
              <button
                onClick={() => setFontSize(prev => Math.min(prev + 0.125, 2))}
                disabled={fontSize >= 2}
                className="p-2 rounded-lg border border-border/60 bg-background/60 text-muted-foreground hover:text-primary hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="تكبير الخط"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => setFontSize(prev => Math.max(prev - 0.125, 1))}
                disabled={fontSize <= 1}
                className="p-2 rounded-lg border border-border/60 bg-background/60 text-muted-foreground hover:text-primary hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="تصغير الخط"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={() => setFontSize(1.125)}
                disabled={fontSize === 1.125}
                className="p-2 rounded-lg border border-border/60 bg-background/60 text-muted-foreground hover:text-primary hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="إعادة ضبط الخط"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{ __html: ARTICLE_STYLE }} />
          <div
            className="article-body w-full p-6 md:p-12"
            lang="ar"
            style={{ '--article-font-size': `${fontSize}rem` } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: article.contentHtml || '' }}
          />

          {article.authors && (
            <div className="border-t border-border/40 px-6 md:px-12 py-6">
              <Link to={`/author/${article.authors.id}`} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
                  {article.authors.image ? (
                    <img src={article.authors.image} alt={article.authors.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                      {article.authors.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground hover:text-primary transition-colors">{article.authors.name}</h3>
                  {article.authors.role && <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{article.authors.role}</span>}
                  {article.authors.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.authors.bio}</p>}
                </div>
              </Link>
            </div>
          )}
        </div>

        <div className="border-t border-border/40 pt-8">
          <ShareButton
            url={`${window.location.origin}${buildArticleUrl(article)}`}
            title={article.title}
            description={article.excerpt}
          />
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="w-1 h-7 bg-primary rounded-full" />
            اقرأ أيضاً
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedArticles.map((related) => (
              <Link
                key={related.id}
                to={`/article/${encodeURIComponent(related.slug || String(related.id))}`}
                className="group rounded-xl border border-border/40 bg-card overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={related.image || ''}
                    alt={related.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  {related.is_exclusive && (
                    <div className="absolute right-2 top-2 rounded-md bg-red-600/80 px-2 py-0.5 text-[10px] text-white font-bold">
                      حصرياً
                    </div>
                  )}
                  <div className="absolute inset-x-2 bottom-2">
                    <div className="rounded-lg bg-black/60 backdrop-blur-sm px-3 py-2">
                      <div className="line-clamp-2 text-sm font-semibold text-white">{related.title}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
