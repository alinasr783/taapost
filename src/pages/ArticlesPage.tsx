import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase, type Article } from '../lib/supabase'
import Seo from '../components/Seo'
import { useSiteSettings } from '../components/useSiteSettings'
import { Search, Calendar, User } from 'lucide-react'

export default function ArticlesPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q')?.trim() || ''
  const site = useSiteSettings()
  const [searchInput, setSearchInput] = useState(q)
  const [showCount, setShowCount] = useState(12)

  const normalizedQ = useMemo(() => q.replaceAll(',', ' ').trim(), [q])

  const articlesQuery = useQuery({
    queryKey: ['articles_page', { q: normalizedQ }],
    queryFn: async () => {
      let query = supabase
        .from('articles')
        .select('id,slug,title,excerpt,image,date,is_exclusive,type,category_id,authors(name,id,image),categories(name)')
        .eq('type', 'article')
        .order('date', { ascending: false })

      if (normalizedQ) {
        const pattern = `%${normalizedQ}%`
        query = query.or(`title.ilike.${pattern},excerpt.ilike.${pattern}`)
      }

      const { data, error } = await query
      if (error) throw error

      return ((data ?? []) as unknown as Article[]).map(a => ({
        ...a,
        category: Array.isArray(a.categories) ? (a.categories[0] as { name: string })?.name || '' : (a.categories as { name: string })?.name || '',
        categoryId: a.category_id,
      }))
    },
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  })

  const allArticles = articlesQuery.data ?? []
  const featured = allArticles[0]
  const rest = useMemo(() => allArticles.slice(1), [allArticles])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchInput.trim()
    if (trimmed) {
      setParams({ q: trimmed })
    } else {
      setParams(new URLSearchParams())
    }
    setShowCount(12)
  }

  if (articlesQuery.isLoading) {
    return (
      <div className="container py-8">
        <Seo title="المقالات" description={`أحدث المقالات في ${site.site_name}`} canonicalPath="/articles" ogType="website" />
        <div className="space-y-6">
          <div className="h-10 w-48 rounded bg-muted/40 animate-pulse" />
          <div className="h-[400px] w-full rounded-2xl bg-muted/40 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[4/3] rounded-xl bg-muted/40 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-muted/50 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted/40 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (articlesQuery.isError) {
    return (
      <div className="container flex flex-col items-center justify-center py-20 text-center">
        <Seo title="خطأ في تحميل المقالات" description="حدث خطأ أثناء تحميل المقالات" robots="noindex,follow" />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 max-w-lg">
          <h2 className="mb-2 text-xl font-bold text-destructive">حدث خطأ أثناء تحميل المقالات</h2>
          <p className="mb-6 text-sm text-muted-foreground">يرجى المحاولة مرة أخرى</p>
          <button onClick={() => articlesQuery.refetch()} className="rounded-xl bg-primary px-6 py-2.5 text-sm text-primary-foreground hover:bg-primary/90">
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-10">
      <Seo
        title={normalizedQ ? `نتائج البحث: ${normalizedQ}` : 'المقالات'}
        description={normalizedQ ? `نتائج بحث في مقالات ${site.site_name} عن: ${normalizedQ}` : `أحدث المقالات في ${site.site_name}`}
        canonicalPath="/articles"
        robots={normalizedQ ? 'noindex,follow' : undefined}
        ogType="website"
        jsonLd={[{ '@type': 'CollectionPage', name: normalizedQ ? `نتائج البحث: ${normalizedQ}` : 'المقالات', inLanguage: 'ar' }]}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground border-r-4 border-primary pr-4">
          المقالات
        </h1>
        <form onSubmit={handleSearch} className="relative w-full md:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ابحث في المقالات..."
            className="w-full pr-10 pl-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </form>
      </div>

      {allArticles.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          {normalizedQ ? `لا توجد نتائج لـ "${normalizedQ}"` : 'لا توجد مقالات بعد'}
        </div>
      )}

      {featured && !normalizedQ && (
        <Link
          to={`/article/${encodeURIComponent(featured.slug || String(featured.id))}`}
          className="group block relative overflow-hidden rounded-2xl shadow-lg"
        >
          <div className="relative h-[300px] md:h-[450px] w-full">
            <img
              src={featured.image}
              alt={featured.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            {featured.is_exclusive && (
              <div className="absolute right-4 top-4 rounded-lg bg-red-600/90 px-3 py-1 text-sm text-white font-bold backdrop-blur">
                حصرياً
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 p-6 md:p-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                  {featured.category || 'غير مصنف'}
                </span>
                {featured.authors && (
                  <span className="flex items-center gap-1.5 text-white/80 text-sm">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-white/20">
                      {featured.authors.image ? (
                        <img src={featured.authors.image} alt={featured.authors.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={14} className="text-white/80 w-full h-full p-0.5" />
                      )}
                    </div>
                    {featured.authors.name}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-white/60 text-sm">
                  <Calendar size={14} />
                  {new Date(featured.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight group-hover:text-primary-foreground/90 transition-colors line-clamp-2">
                {featured.title}
              </h2>
              {featured.excerpt && (
                <p className="mt-3 text-white/70 line-clamp-2 max-w-2xl text-sm md:text-base">
                  {featured.excerpt}
                </p>
              )}
            </div>
          </div>
        </Link>
      )}

      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {(normalizedQ ? allArticles : rest.slice(0, showCount)).map((article) => (
            <Link
              key={article.id}
              to={`/article/${encodeURIComponent(article.slug || String(article.id))}`}
              className="group flex flex-col rounded-xl border border-border/40 bg-card overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={article.image}
                  alt={article.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                {article.is_exclusive && (
                  <div className="absolute right-3 top-3 rounded-md bg-red-600/90 px-2 py-0.5 text-xs text-white font-bold">
                    حصرياً
                  </div>
                )}
              </div>
              <div className="flex-1 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-medium">
                    {article.category || 'غير مصنف'}
                  </span>
                  <span>{new Date(article.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
                <h3 className="font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                  {article.title}
                </h3>
                {article.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {article.excerpt}
                  </p>
                )}
                {article.authors && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-primary/10 shrink-0">
                      {article.authors.image ? (
                        <img src={article.authors.image} alt={article.authors.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary">
                          {article.authors.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{article.authors.name}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!normalizedQ && showCount < rest.length && (
        <div className="text-center py-4">
          <button
            onClick={() => setShowCount(prev => prev + 12)}
            className="px-8 py-3 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-primary-foreground transition-all font-medium text-sm"
          >
            عرض المزيد
          </button>
        </div>
      )}
    </div>
  )
}
