import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase, type Article, type HomepageSection } from '../lib/supabase'
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

const emptyArticles: Article[] = []
const emptySections: HomepageSection[] = []

export default function Home() {
  const navigate = useNavigate()
  const site = useSiteSettings()
  const limit = 60

  const homeQuery = useQuery({
    queryKey: ['home_data', { limit }],
    queryFn: async () => {
      const [articlesRes, sectionsRes] = await Promise.all([
        supabase
          .from('articles')
          .select('id,slug,title,excerpt,content,image,category_id,type,date,is_exclusive,categories(id,name,slug)')
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
          return {
            ...(a as unknown as Article),
            categoryId: typeof a.category_id === 'number' ? a.category_id : undefined,
            category: categoryName,
            contentHtml: typeof a.content === 'string' ? a.content : undefined,
            categories: category ? (category as Article['categories']) : undefined,
          } as Article
        })

      return { articles, sections }
    },
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  })

  const articlesData = homeQuery.data?.articles
  const sections = homeQuery.data?.sections ?? emptySections

  const sortedArticles = useMemo(
    () => [...(articlesData ?? emptyArticles)].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [articlesData]
  )

  if (homeQuery.isLoading) {
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

           // Filter based on source type
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
             // Exclude carousel articles if desired, or just show latest
             // Let's show latest excluding the first 5 if carousel is present, 
             // but simpler is just latest sorted.
             // If we want to avoid duplicates with carousel, we might need more logic.
             // For now, let's just show sorted articles.
             const list = sortedArticles.slice(0, count);
             if (list.length === 0) return null;
             
             return (
                <section key={section.id} className="container space-y-6">
                    <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                        <h2 className="text-2xl font-bold border-r-4 border-primary pr-3">{section.title || 'أحدث المقالات'}</h2>
                         <button
                          type="button"
                          onClick={() => navigate('/posts')} 
                          className="text-xs font-medium bg-primary/10 text-primary px-4 py-1.5 rounded-full hover:bg-primary hover:text-primary-foreground transition-all"
                        >
                          المزيد
                        </button>
                    </div>
                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {list.map((article) => (
                           <div key={article.id} 
                                onClick={() =>
                                  navigate(article.slug ? `/مقال/${encodeURIComponent(article.slug)}` : `/post/${article.id}`)
                                }
                                className="group cursor-pointer space-y-3"
                           >
                                <div className="relative aspect-video overflow-hidden rounded-lg shadow-sm group-hover:shadow-md transition-all border border-border/50 group-hover:border-primary/50">
                                     <img 
                                        src={article.image} 
                                        alt={article.title}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
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

        if (section.type === 'category_section' || section.type === 'category_grid') {
            if (!section.category_id && !section.categories) return null;
            
            // Get category info from joined data or section settings
            const catName = section.categories?.name || section.title;
            const catId = section.category_id || section.categories?.id;

            const list = sortedArticles
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
                        navigate(article.slug ? `/مقال/${encodeURIComponent(article.slug)}` : `/post/${article.id}`)
                      }
                      className="relative flex min-w-[360px] max-w-[480px] flex-col overflow-hidden rounded-[5px] border border-white/10 bg-black/30 text-right shadow-sm backdrop-blur-md"
                    >
                      <div className="relative h-56 w-full">
                        <img
                          src={article.image}
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

        return null;
      })}
    </div>
  )
}
