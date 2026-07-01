import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, type Article, type Author, type HomepageSection } from '../lib/supabase'
import HomeCarousel from '../components/HomeCarousel'
import Seo from '../components/Seo'
import { useSiteSettings } from '../components/useSiteSettings'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function getString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function getSettingsCount(settings: unknown, fallback: number) {
  if (!isRecord(settings)) return fallback
  return getNumber(settings.count, fallback)
}

function getSettingsSourceType(settings: unknown) {
  if (!isRecord(settings)) return null
  const v = settings.source_type
  if (v === 'latest' || v === 'category' || v === 'categories') return v
  return null
}

function getSettingsSourceIds(settings: unknown) {
  if (!isRecord(settings) || !Array.isArray(settings.source_ids)) return []
  return settings.source_ids.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
}

function getSettingsContentType(settings: unknown): string {
  if (!isRecord(settings)) return 'all'
  const v = settings.content_type
  return (v === 'article' || v === 'other') ? v : 'all'
}

function filterByContentType(articles: Article[], contentType: string): Article[] {
  if (contentType === 'all') return articles
  return articles.filter(a => a.type === contentType)
}

const emptyArticles: Article[] = []
const emptySections: HomepageSection[] = []
const emptyAuthors: Author[] = []

export default function Home() {
  const navigate = useNavigate()
  const site = useSiteSettings()
  const queryClient = useQueryClient()
  const limit = 30

  const homeQuery = useQuery({
    queryKey: ['home_data', 30],
    queryFn: async () => {
      const [articlesRes, sectionsRes, authorsRes] = await Promise.all([
        supabase
          .from('articles')
          .select('id,slug,title,excerpt,image,category_id,type,date,is_exclusive,categories(id,name,slug),authors(id,name,image)')
          .order('date', { ascending: false })
          .limit(limit),
        supabase
          .from('homepage_sections')
          .select(
            `
            *,
            categories (
              id,
              name,
              slug
            )
          `
          )
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('authors')
          .select('id, name, image, bio, role, slug')
          .order('name'),
      ])

      let sections: HomepageSection[] = []

      if (sectionsRes.error || !sectionsRes.data || sectionsRes.data.length === 0) {
        sections = [
          { id: 1, type: 'carousel', title: 'Featured', display_order: 1, is_active: true },
          { id: 2, type: 'latest_grid', title: 'Latest Articles', display_order: 2, is_active: true },
        ]
      } else {
        sections = sectionsRes.data
          .filter(isRecord)
          .map((s) => {
            const joined = s.categories
            const categories = Array.isArray(joined) ? (joined[0] as unknown) : joined
            return { ...s, categories } as HomepageSection
          }) as HomepageSection[]
      }

      const rawArticles = articlesRes.data ?? []
      const articles = rawArticles
        .filter(isRecord)
    .map((a) => {
      const joined = a.categories
      const categoryRow = Array.isArray(joined) ? (joined[0] as unknown) : joined
      const categoryName = isRecord(categoryRow) ? getString(categoryRow.name, '') : ''
      const category = isRecord(categoryRow) ? (categoryRow as unknown) : null
      const joinedAuthors = a.authors
      const authorRow = Array.isArray(joinedAuthors) ? (joinedAuthors[0] as unknown) : joinedAuthors
      return {
        ...(a as unknown as Article),
        categoryId: typeof a.category_id === 'number' ? a.category_id : undefined,
        category: categoryName,
        categories: category ? (category as Article['categories']) : undefined,
        authors: isRecord(authorRow) ? (authorRow as Article['authors']) : undefined,
      } as Article
    })

      return { articles, sections, authors: (authorsRes.data ?? []) as Author[] }
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  })

  const articlesData = homeQuery.data?.articles
  const sections = homeQuery.data?.sections ?? emptySections
  const authorsData = homeQuery.data?.authors ?? emptyAuthors
  const hadData = useRef(false)
  if (homeQuery.data) hadData.current = true

  const sortedArticles = useMemo(
    () => [...(articlesData ?? emptyArticles)].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [articlesData]
  )

  if (homeQuery.isError) {
    console.error('Home query error:', homeQuery.error)
  }

  const prefetchArticle = (slug: string | undefined, id: number) => {
    const queryType = slug ? { type: 'slug' as const, value: slug } : { type: 'id' as const, value: id }
    if (queryClient.getQueryData(['article_page', queryType])) return

    // Minimal prefetch: only get basic article data without processing
    // ArticlePage will re-fetch with full processing when navigated to
    queryClient.prefetchQuery({
      queryKey: ['article_page', queryType],
      queryFn: async () => {
        const baseQuery = supabase
          .from('articles')
          .select('id, slug, title, excerpt, image, category_id, date, is_exclusive, content_source, categories(name), authors(id, name, image, bio, role)')

        const { data, error } = slug
          ? await baseQuery.eq('slug', slug).single()
          : await baseQuery.eq('id', id).single()

        if (error) throw error
        if (!data) return { article: null as Article | null, toc: [], related: [], redirectToId: null as number | null }

        const authorData = Array.isArray(data.authors)
          ? (data.authors.length > 0 ? data.authors[0] : null)
          : data.authors

        const article: Article = {
          ...(data as Article),
          category: (Array.isArray(data.categories) ? data.categories[0]?.name : data.categories?.name) || '',
          authors: authorData,
          contentHtml: data.content || '',
        } as Article

        return {
          article,
          toc: [],
          related: [],
          redirectToId: null as number | null,
        }
      },
      staleTime: 30_000, // Short stale time so ArticlePage will re-fetch with full processing
      gcTime: 5 * 60_000,
    })
  }

  if (!homeQuery.data && !hadData.current) {
    if (homeQuery.isPending) {
      // Show loading only on very first load (never again after data exists)
      return (
      <div className="container py-8 space-y-6">
        <Seo
          title=""
          description={site.site_description}
          canonicalPath="/"
          ogType="website"
          jsonLd={[
            {
              '@type': 'WebSite',
              name: site.site_name,
              description: site.site_description,
              inLanguage: 'ar',
            },
            site.logo_url
              ? {
                  '@type': 'Organization',
                  name: site.site_name,
                  logo: {
                    '@type': 'ImageObject',
                    url: site.logo_url,
                  },
                }
              : {
                  '@type': 'Organization',
                  name: site.site_name,
                },
          ]}
        />
        <div className="h-10 w-48 rounded bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="space-y-3">
              <div className="aspect-video rounded-lg bg-muted/40 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-muted/50 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

    if (homeQuery.isError) {
      return (
        <div className="container py-8 text-center text-muted-foreground">
          <p>تعذر تحميل الصفحة. حاول مرة أخرى.</p>
        </div>
      )
    }
  }

  return (
    <div className="space-y-8 pb-10 md:space-y-10">
      <Seo
        title=""
        description={site.site_description}
        canonicalPath="/"
        ogType="website"
        jsonLd={[
          {
            '@type': 'WebSite',
            name: site.site_name,
            description: site.site_description,
            inLanguage: 'ar',
          },
          site.logo_url
            ? {
                '@type': 'Organization',
                name: site.site_name,
                logo: {
                  '@type': 'ImageObject',
                  url: site.logo_url,
                },
              }
            : {
                '@type': 'Organization',
                name: site.site_name,
              },
        ]}
      />
      {sections.map((section) => {
        if (section.type === 'carousel') {
           const count = getSettingsCount(section.settings, 5)
           let slides = sortedArticles;
           const contentType = getSettingsContentType(section.settings)
           slides = filterByContentType(slides, contentType)

           const sourceType = getSettingsSourceType(section.settings)
           if (sourceType === 'category' && section.category_id) {
             slides = slides.filter(a => a.categoryId === section.category_id);
           } else if (sourceType === 'categories') {
             const sourceIds = getSettingsSourceIds(section.settings)
             slides = slides.filter(a => a.categoryId != null && sourceIds.includes(a.categoryId));
           }
           
           slides = slides.slice(0, count);
           
           if (slides.length === 0) return null;
           return <HomeCarousel key={section.id} articles={slides} />
        }

        if (section.type === 'latest_grid') {
             const count = getSettingsCount(section.settings, 6)
             const contentType = getSettingsContentType(section.settings)
             let list = sortedArticles;
             list = filterByContentType(list, contentType)
             list = list.slice(0, count);
             if (list.length === 0) return null;
             
             return (
                <section key={section.id} className="container space-y-6">
                    <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                        <h2 className="text-2xl font-bold border-r-4 border-primary pr-3">{section.title || 'أحدث المقالات'}</h2>
                         <button
                           type="button"
                           onClick={() => navigate('/articles')} 
                          className="text-xs font-medium bg-primary/10 text-primary px-4 py-1.5 rounded-full hover:bg-primary hover:text-primary-foreground transition-all"
                        >
                          المزيد
                        </button>
                    </div>
                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {list.map((article) => (
                           <div key={article.id} 
                                 onClick={() =>
                                   navigate(article.slug ? `/article/${encodeURIComponent(article.slug)}` : `/article/${article.id}`)
                                 }
                                 onMouseEnter={() => prefetchArticle(article.slug, article.id)}
                                 className="group cursor-pointer space-y-3"
                            >
                                 <div className="relative aspect-video overflow-hidden rounded-lg shadow-sm group-hover:shadow-md transition-all border border-border/50 group-hover:border-primary/50">
                                     <img 
                                        src={article.image} 
                                        alt={article.title}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                        decoding="async"
                                        width={640}
                                        height={360}
                                     />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-medium">{article.category}</span>
                                        <span>•</span>
                                        {article.is_exclusive ? (
                                            <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-[10px]">حصرياً</span>
                                        ) : (
                                            <span>{new Date(article.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        )}
                                    </div>
                                    <h3 className="line-clamp-2 text-lg font-bold group-hover:text-primary transition-colors leading-normal">
                                        {article.title}
                                    </h3>
                                    {article.authors && (
                                      <div className="flex items-center gap-1.5 pt-1">
                                        <div className="w-5 h-5 rounded-full overflow-hidden bg-primary/10 shrink-0">
                                          {article.authors.image ? (
                                            <img src={article.authors.image} alt={article.authors.name} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-primary">
                                              {article.authors.name.charAt(0)}
                                            </div>
                                          )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{article.authors.name}</span>
                                      </div>
                                    )}
                                </div>
                           </div>
                        ))}
                     </div>
                </section>
             )
        }

        if (section.type === 'author_focus') {
             const count = getSettingsCount(section.settings, 6)
             let list = sortedArticles
               .filter(a => a.type === 'article' && a.authors && a.authors.name)
               .slice(0, count)
             if (list.length === 0) return null

             return (
               <section key={section.id} className="container space-y-6">
                 <div className="flex items-center gap-3 border-b border-primary/10 pb-4">
                   <div className="w-1 h-6 rounded-full bg-primary/60" />
                   <h2 className="text-2xl font-bold text-foreground">{section.title || 'مقالات الكتّاب'}</h2>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {list.map((article) => (
                     <button
                       key={article.id}
                       type="button"
                       onClick={() =>
                         navigate(article.slug ? `/article/${encodeURIComponent(article.slug)}` : `/article/${article.id}`)
                       }
                       onMouseEnter={() => prefetchArticle(article.slug, article.id)}
                       className="group relative flex items-center gap-4 p-3 rounded-2xl border border-border/30 bg-gradient-to-l from-primary/[0.02] to-transparent hover:shadow-md hover:border-primary/25 transition-all duration-300 w-full text-right overflow-hidden"
                     >
                       <div className="absolute right-0 top-3 bottom-3 w-0.5 bg-primary/0 group-hover:bg-primary/30 rounded-full transition-all duration-300" />
                       <div className="relative w-16 h-16 md:w-[72px] md:h-[72px] rounded-2xl overflow-hidden border-2 border-primary/10 shrink-0 bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm group-hover:shadow-md group-hover:border-primary/30 transition-all duration-300">
                         {article.authors?.image ? (
                           <img src={article.authors.image} alt={article.authors.name} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary">
                             {article.authors?.name?.charAt(0) || '?'}
                           </div>
                         )}
                       </div>
                       <div className="flex-1 min-w-0 py-1">
                         <h3 className="font-bold text-foreground group-hover:text-primary transition-colors leading-snug text-base md:text-lg line-clamp-2">
                           {article.title}
                         </h3>
                         <div className="flex items-center gap-2 mt-2">
                           <span className="text-xs text-muted-foreground/80">{article.authors?.name}</span>
                           <span className="text-[10px] text-muted-foreground/30">•</span>
                           <span className="text-[11px] text-muted-foreground/50">
                             {new Date(article.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                           </span>
                         </div>
                       </div>
                     </button>
                   ))}
                 </div>
               </section>
             )
        }

        if (section.type === 'category_section' || section.type === 'category_grid') {
            if (!section.category_id && !section.categories) return null;
            
            const catName = section.categories?.name || section.title;
            const catId = section.category_id || section.categories?.id;

            const contentType = getSettingsContentType(section.settings)
            let list = filterByContentType(sortedArticles, contentType)
            list = list
              .filter((a) => a.categoryId === catId)
              .slice(0, getSettingsCount(section.settings, 4))
            
            if (!list.length) return null;

             return (
            <div key={section.id} className="container space-y-4">
              <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    if (catId) navigate(`/category/${catId}`)
                  }}
                  className="text-2xl font-bold border-r-4 border-primary pr-3 hover:text-primary transition-colors"
                >
                  {catName}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (catId) navigate(`/category/${catId}`)
                  }}
                  className="text-xs font-medium bg-primary/10 text-primary px-4 py-1.5 rounded-full hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  المزيد
                </button>
              </div>
              <div className="overflow-x-auto">
                <div className="flex gap-7 pb-4">
                  {list.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() =>
                        navigate(article.slug ? `/article/${encodeURIComponent(article.slug)}` : `/article/${article.id}`)
                      }
                      onMouseEnter={() => prefetchArticle(article.slug, article.id)}
                      className="relative flex min-w-[360px] max-w-[480px] flex-col overflow-hidden rounded-[5px] border border-white/10 bg-black/30 text-right shadow-sm backdrop-blur-md"
                    >
                      <div className="relative h-56 w-full">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                          width={480}
                          height={224}
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
                                  {new Date(article.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
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
            </div>
          )
        }

        if (section.type === 'category_list') {
            if (!section.category_id && !section.categories) return null;

            const catName = section.categories?.name || section.title;
            const catId = section.category_id || section.categories?.id;

            const contentType = getSettingsContentType(section.settings)
            let list = filterByContentType(sortedArticles, contentType)
            list = list
              .filter((a) => a.categoryId === catId)
              .slice(0, getSettingsCount(section.settings, 5))

            if (!list.length) return null;

            return (
              <section key={section.id} className="container space-y-6">
                <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                  <button
                    type="button"
                    onClick={() => { if (catId) navigate(`/category/${catId}`) }}
                    className="text-2xl font-bold border-r-4 border-primary pr-3 hover:text-primary transition-colors"
                  >
                    {catName}
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (catId) navigate(`/category/${catId}`) }}
                    className="text-xs font-medium bg-primary/10 text-primary px-4 py-1.5 rounded-full hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    المزيد
                  </button>
                </div>
                <div className="divide-y divide-border/50">
                  {list.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() =>
                        navigate(article.slug ? `/article/${encodeURIComponent(article.slug)}` : `/article/${article.id}`)
                      }
                      onMouseEnter={() => prefetchArticle(article.slug, article.id)}
                      className="group flex gap-5 py-5 w-full text-right hover:bg-muted/30 px-3 -mx-3 rounded-lg transition-colors"
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(article.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          {article.is_exclusive && (
                            <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-[10px]">حصرياً</span>
                          )}
                        </div>
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                          {article.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {article.excerpt}
                        </p>
                      </div>
                      <div className="w-32 h-24 shrink-0 rounded-lg overflow-hidden">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )
        }

        if (section.type === 'custom') {
            const count = getSettingsCount(section.settings, 6)
            const contentType = getSettingsContentType(section.settings)
            let list = filterByContentType(sortedArticles, contentType)
            list = list.slice(0, count)
            if (list.length === 0 && !section.title) return null;

            return (
              <section key={section.id} className="container space-y-6">
                {section.title && (
                  <div className="border-b border-primary/10 pb-4">
                    <h2 className="text-2xl font-bold border-r-4 border-primary pr-3">{section.title}</h2>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((article) => (
                    <div
                      key={article.id}
                      onClick={() =>
                        navigate(article.slug ? `/article/${encodeURIComponent(article.slug)}` : `/article/${article.id}`)
                      }
                      onMouseEnter={() => prefetchArticle(article.slug, article.id)}
                      className="group cursor-pointer space-y-3"
                    >
                      <div className="relative aspect-video overflow-hidden rounded-lg shadow-sm group-hover:shadow-md transition-all border border-border/50 group-hover:border-primary/50">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                          width={640}
                          height={360}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-medium">{article.category}</span>
                          <span>•</span>
                          {article.is_exclusive ? (
                            <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-[10px]">حصرياً</span>
                          ) : (
                            <span>{new Date(article.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          )}
                        </div>
                        <h3 className="line-clamp-2 text-lg font-bold group-hover:text-primary transition-colors leading-normal">
                          {article.title}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
        }

        return null;
      })}
    </div>
  )
}
