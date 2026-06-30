import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, User as UserIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase, type Author, type Article } from '../lib/supabase'
import Seo from '../components/Seo'
import { useSiteSettings } from '../components/useSiteSettings'

export default function AuthorPage() {
  const { id, slug } = useParams()
  const navigate = useNavigate()
  const site = useSiteSettings()
  const authorId = id && /^\d+$/.test(id) ? Number(id) : null
  const authorSlug = slug ? decodeURIComponent(slug) : ''

  const authorQuery = useQuery({
    queryKey: ['author_page', { authorId, authorSlug }],
    queryFn: async () => {
      if (!authorId && !authorSlug) return { author: null, articles: [], redirectToId: null as number | null }

      let authorData: Author | null = null
      if (authorId) {
        const { data, error } = await supabase.from('authors').select('*').eq('id', authorId).maybeSingle()
        if (error) throw error
        authorData = (data as Author | null) ?? null
      } else if (authorSlug) {
        const { data, error } = await supabase.from('authors').select('*').eq('slug', authorSlug).maybeSingle()
        if (error) throw error
        authorData = (data as Author | null) ?? null
        if (authorData) return { author: null, articles: [], redirectToId: authorData.id }
      }

      if (!authorData) return { author: null, articles: [], redirectToId: null as number | null }

      type AuthorArticle = Pick<Article, 'id' | 'slug' | 'title' | 'excerpt' | 'image' | 'date' | 'is_exclusive'> & {
        category_id?: number
        categories?: { id: number; name: string; slug: string } | { id: number; name: string; slug: string }[] | null
      }
      const { data: artData, error: artError } = await supabase
        .from('articles')
        .select('id,slug,title,excerpt,image,date,is_exclusive,category_id,categories(id,name,slug)')
        .eq('author_id', authorData.id)
        .eq('type', 'article')
        .order('date', { ascending: false })
        .limit(60)

      if (artError) throw artError

      return { author: authorData, articles: (artData ?? []) as AuthorArticle[], redirectToId: null as number | null }
    },
    enabled: Boolean(authorId || authorSlug),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  })

  useEffect(() => {
    const redirectToId = authorQuery.data?.redirectToId
    if (redirectToId) navigate(`/author/${redirectToId}`, { replace: true })
  }, [authorQuery.data?.redirectToId, navigate])

  const author = authorQuery.data?.author ?? null
  const articles = authorQuery.data?.articles ?? []

  const articlesByCategory = new Map<number, { name: string; slug: string; articles: typeof articles }>()
  for (const a of articles) {
    const cat = Array.isArray(a.categories) ? a.categories[0] : a.categories
    const catName = (cat && typeof cat === 'object' && 'name' in cat ? cat.name : '') || 'عام'
    const catSlug = (cat && typeof cat === 'object' && 'slug' in cat ? cat.slug : '') || ''
    const catId = a.category_id ?? 0
    if (!articlesByCategory.has(catId)) {
      articlesByCategory.set(catId, { name: catName, slug: catSlug, articles: [] })
    }
    articlesByCategory.get(catId)!.articles.push(a)
  }

  if (authorQuery.isLoading) {
    return (
      <div className="container max-w-7xl py-8 md:py-12 space-y-8">
        <div className="h-8 w-10 rounded-full bg-muted/40 animate-pulse" />
        <div className="h-48 w-full rounded-lg bg-muted/40 animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-muted/40 animate-pulse" />
          <div className="space-y-2"><div className="h-6 w-40 rounded bg-muted/50 animate-pulse" /><div className="h-4 w-60 rounded bg-muted/40 animate-pulse" /></div>
        </div>
      </div>
    )
  }

  if (!author) {
    return (
      <div className="container flex flex-col items-center justify-center py-20 text-center">
        <Seo title="الكاتب غير موجود" description="عذراً، هذا الكاتب غير موجود" robots="noindex,follow" />
        <h2 className="mb-4 text-2xl font-bold text-foreground">عذراً، الكاتب غير موجود</h2>
        <button onClick={() => navigate('/')} className="rounded-[5px] bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90">العودة للرئيسية</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Seo
        title={`${author.name} - كاتب`}
        description={author.bio?.slice(0, 160) || `مقالات ${author.name} على ${site.site_name}`}
        canonicalPath={author.slug ? `/كاتب/${encodeURIComponent(author.slug)}` : `/author/${author.id}`}
        ogType="profile"
        image={author.image}
        jsonLd={{ '@context': 'https://schema.org', '@type': 'Person', name: author.name, description: author.bio || '', image: author.image || undefined, jobTitle: author.role || undefined, url: author.website || undefined }}
      />

      <div className="container max-w-7xl py-6 md:py-10">
        {/* Banner Area with floating back button */}
        <div className="relative mb-12">
          <div className="w-full h-40 md:h-56 rounded-[5px] overflow-hidden bg-muted/30">
            {author.banner ? (
              <img src={author.banner} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
            )}
          </div>

          {/* Floating Glass Back Button - far right in RTL */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-background/70 backdrop-blur-md border border-white/20 shadow-lg text-muted-foreground hover:text-foreground hover:bg-background/90 transition-all"
            aria-label="عودة"
          >
            <ArrowRight className="h-5 w-5" />
          </button>

          {/* Profile Card */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-5 -mt-16 md:-mt-20 px-4">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-background shadow-xl shrink-0 bg-card">
              {author.image ? (
                <img src={author.image} alt={author.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold">{author.name.charAt(0)}</div>
              )}
            </div>
            <div className="flex-1">
              <div className="rounded-[5px] border border-white/20 bg-card/60 backdrop-blur-xl p-5 md:p-6 shadow-lg text-center md:text-right">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{author.name}</h1>
                {author.role && (
                  <span className="inline-block mt-2 text-xs text-primary bg-primary/10 px-3 py-0.5 rounded-full font-medium">{author.role}</span>
                )}
                {author.bio && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">{author.bio}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Articles Grouped by Category */}
        {articles.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">لا توجد مقالات لهذا الكاتب حالياً</p>
          </div>
        ) : (
          <div className="space-y-14">
            {[...articlesByCategory.entries()].map(([catId, { name, slug: catSlug, articles: catArticles }]) => (
              <section key={catId}>
                <div className="flex items-center justify-between border-b border-primary/10 pb-4 mb-6">
                  <h2 className="text-2xl font-bold border-r-4 border-primary pr-3">{name}</h2>
                  {catSlug && (
                    <button
                      type="button"
                      onClick={() => navigate(`/category/${catSlug}`)}
                      className="text-xs font-medium bg-primary/10 text-primary px-4 py-1.5 rounded-full hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      المزيد
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <div className="flex gap-7 pb-4">
                    {catArticles.map((article) => (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() => navigate(article.slug ? `/article/${encodeURIComponent(article.slug)}` : `/article/${article.id}`)}
                        className="relative flex min-w-[360px] max-w-[480px] flex-col overflow-hidden rounded-[5px] border border-white/10 bg-black/30 text-right shadow-sm backdrop-blur-md"
                      >
                        <div className="relative h-56 w-full">
                          <img
                            src={article.image || ''}
                            alt={article.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                          {article.is_exclusive && (
                            <div className="absolute right-2 top-2 rounded-[5px] border border-white/30 px-2 py-1 text-[11px] text-white/90 backdrop-blur bg-red-600/80 font-bold">
                              حصرياً
                            </div>
                          )}
                          <div className="absolute inset-x-2 bottom-2">
                            <div className="space-y-1 rounded-[5px] border border-white/20 bg-black/50 px-3 py-2 text-white backdrop-blur-md">
                              {!article.is_exclusive && (
                                <div className="text-[10px] text-white/70">
                                  {article.date ? new Date(article.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                                </div>
                              )}
                              <div className="line-clamp-2 text-sm font-semibold">
                                {article.title}
                              </div>
                              <div className="line-clamp-2 text-[11px] text-white/85">
                                {article.excerpt}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
