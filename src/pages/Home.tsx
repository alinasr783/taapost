import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, type Article, type HomepageSection } from '../lib/supabase'
import HomeCarousel from '../components/HomeCarousel'

export default function Home() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState<Article[]>([])
  const [sections, setSections] = useState<HomepageSection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch articles
        const { data: articlesData, error: articlesError } = await supabase
          .from('articles')
          .select('*, categories(id, name, slug)')
          .order('date', { ascending: false })

        if (articlesError) {
          console.error('Error fetching articles:', articlesError)
        }

        // Fetch homepage sections
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('homepage_sections')
          .select(`
            *,
            categories (
              id,
              name,
              slug
            )
          `)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
        
        if (sectionsError) {
          console.error('Error fetching sections:', sectionsError)
          // Fallback if table doesn't exist or is empty
          const defaultSections: HomepageSection[] = [
            { id: 1, type: 'carousel', title: 'Featured', display_order: 1, is_active: true },
            { id: 2, type: 'latest_grid', title: 'Latest Articles', display_order: 2, is_active: true }
          ]
          setSections(defaultSections)
        } else if (sectionsData && sectionsData.length > 0) {
          // transform the data to match the type if needed, specifically the joined category
          const typedSections = sectionsData.map((s: any) => ({
            ...s,
            categories: Array.isArray(s.categories) ? s.categories[0] : s.categories
          }))
          setSections(typedSections)
        } else {
             // Fallback if empty
            const defaultSections: HomepageSection[] = [
                { id: 1, type: 'carousel', title: 'Featured', display_order: 1, is_active: true },
                { id: 2, type: 'latest_grid', title: 'Latest Articles', display_order: 2, is_active: true }
            ]
            setSections(defaultSections)
        }
        
        if (articlesData) {
          const mappedArticles = articlesData.map((a: any) => ({
            ...a,
            categoryId: a.category_id,
            category: (Array.isArray(a.categories) ? a.categories[0]?.name : a.categories?.name) || '',
            categorySlug: (Array.isArray(a.categories) ? a.categories[0]?.slug : a.categories?.slug) || '',
            contentHtml: a.content
          }))
          setArticles(mappedArticles)
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const sortedArticles = useMemo(
    () => [...articles].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [articles]
  )

  const carouselArticles = useMemo(() => sortedArticles.slice(0, 5), [sortedArticles])

  if (loading) {
    return <div className="flex items-center justify-center py-20 min-h-[50vh]">
      <div className="text-lg text-muted-foreground">جاري التحميل...</div>
    </div>
  }

  return (
    <div className="space-y-8 pb-10 md:space-y-10">
      {sections.map((section) => {
        if (section.type === 'carousel') {
           const count = section.settings?.count || 5;
           let slides = sortedArticles;

           // Filter based on source type
           if (section.settings?.source_type === 'category' && section.category_id) {
             slides = slides.filter(a => a.categoryId === section.category_id);
           } else if (section.settings?.source_type === 'categories' && Array.isArray(section.settings?.source_ids)) {
             slides = slides.filter(a => section.settings.source_ids.includes(a.categoryId));
           }
           
           slides = slides.slice(0, count);
           
           if (slides.length === 0) return null;
           return <HomeCarousel key={section.id} articles={slides} />
        }

        if (section.type === 'latest_grid') {
             const count = section.settings?.count || 6;
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
                          onClick={() => navigate('/المقالات')} 
                          className="text-xs font-medium bg-primary/10 text-primary px-4 py-1.5 rounded-full hover:bg-primary hover:text-primary-foreground transition-all"
                        >
                          المزيد
                        </button>
                    </div>
                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {list.map((article) => (
                           <div key={article.id} 
                                onClick={() => navigate(`/مقال/${encodeURIComponent(article.slug)}`)}
                                className="group cursor-pointer space-y-3"
                           >
                                <div className="relative aspect-video overflow-hidden rounded-lg shadow-sm group-hover:shadow-md transition-all border border-border/50 group-hover:border-primary/50">
                                     <img 
                                        src={article.image} 
                                        alt={article.title}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
            const catSlug = section.categories?.slug || section.categories?.name; // Fallback
            const catId = section.category_id || section.categories?.id;

            const list = sortedArticles.filter((a) => a.categoryId === catId).slice(0, section.settings?.count || 4);
            
            if (!list.length) return null;

             return (
            <div key={section.id} className="container space-y-4">
              <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                <button
                  type="button"
                  onClick={() => navigate(`/قسم/${encodeURIComponent(catName)}`)}
                  className="text-2xl font-bold border-r-4 border-primary pr-3 hover:text-primary transition-colors"
                >
                  {catName}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/قسم/${encodeURIComponent(catName)}`)}
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
                        navigate(`/مقال/${encodeURIComponent(article.slug)}`)
                      }
                      className="relative flex min-w-[360px] max-w-[480px] flex-col overflow-hidden rounded-[5px] border border-white/10 bg-black/30 text-right shadow-sm backdrop-blur-md"
                    >
                      <div className="relative h-56 w-full">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="h-full w-full object-cover"
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
