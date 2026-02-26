import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, type Article } from '../lib/supabase'

export default function Home() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch articles
        const { data: articlesData, error: articlesError } = await supabase
          .from('articles')
          .select('*, categories(name, slug)')
          .order('date', { ascending: false })

        if (articlesError) {
          console.error('Error fetching articles:', articlesError)
        }

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('display_order', { ascending: true })
        
        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError)
        }
        
        if (articlesData) {
          const mappedArticles = articlesData.map((a: any) => ({
            ...a,
            categoryId: a.category_id,
            category: (Array.isArray(a.categories) ? a.categories[0]?.name : a.categories?.name) || '',
            contentHtml: a.content
          }))
          setArticles(mappedArticles)
        }

        if (categoriesData) {
          setCategories(categoriesData.map((c: any) => c.name))
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

  const scrollToSlide = (index: number) => {
    if (scrollRef.current) {
      const container = scrollRef.current
      const slideWidth = container.clientWidth
      container.scrollTo({
        left: -(index * slideWidth), // For RTL, usually negative or positive depending on browser implementation of scrollLeft. Let's try standard scrollTo with behavior.
        // Actually, let's use scrollIntoView on the child element if possible, or calculate position.
        // In RTL, scrollLeft 0 is usually the rightmost point. Scrolling left means negative values in some browsers (Chrome) or positive (Firefox/Safari old).
        // Safest is to use scrollIntoView on the child.
        behavior: 'smooth'
      })
      // Better approach for RTL compatibility:
      const child = container.children[index] as HTMLElement
      if (child) {
        // child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }) 
        // inline: 'start' in RTL should align to the right.
        // However, if we want full control, we might need to test.
        // Let's stick to scrollIntoView.
        child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
      setCarouselIndex(index)
    }
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextIndex = (carouselIndex + 1) % carouselArticles.length
    scrollToSlide(nextIndex)
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    const prevIndex = carouselIndex === 0 ? carouselArticles.length - 1 : carouselIndex - 1
    scrollToSlide(prevIndex)
  }
  
  const handleScroll = () => {
    if (scrollRef.current) {
      const container = scrollRef.current
      const slideWidth = container.clientWidth
      // Calculate index based on scroll position. 
      // In RTL, scrollLeft might be negative or positive. using Math.abs helps.
      const scrollLeft = Math.abs(container.scrollLeft)
      const newIndex = Math.round(scrollLeft / slideWidth)
      if (newIndex !== carouselIndex && newIndex >= 0 && newIndex < carouselArticles.length) {
         setCarouselIndex(newIndex)
      }
    }
  }

  // Auto-play effect
  useEffect(() => {
    if (isPaused || carouselArticles.length === 0) return
    
    const timer = setTimeout(() => {
      const next = (carouselIndex + 1) % carouselArticles.length
      scrollToSlide(next)
    }, 3000)

    return () => clearTimeout(timer)
  }, [carouselIndex, isPaused, carouselArticles.length])

  if (loading) {
    return <div className="flex items-center justify-center py-20 min-h-[50vh]">
      <div className="text-lg text-muted-foreground">جاري التحميل...</div>
    </div>
  }

  if (carouselArticles.length === 0) {
    return null
  }

  return (
    <div className="space-y-8 pb-10 md:space-y-10">
      <section 
        className="w-full relative group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onScroll={handleScroll}
        >
          {carouselArticles.map((activeSlide) => (
            <div 
              key={activeSlide.id} 
              className="relative w-full flex-shrink-0 snap-center h-64 sm:h-80 md:h-[380px] lg:h-[430px] cursor-pointer"
              onClick={() => navigate(`/مقال/${encodeURIComponent(activeSlide.slug)}`)}
            >
              <img
                src={activeSlide.image}
                alt={activeSlide.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-black/85 via-black/50 to-transparent" />
              <div className="absolute inset-0">
                <div className="container flex h-full flex-col justify-between py-4 md:py-8">
                  <div className="space-y-3 text-right text-white md:ml-auto md:mr-0 md:max-w-4xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/قسم/${encodeURIComponent(activeSlide.category || '')}`)
                        }}
                        className="inline-flex rounded-[5px] border border-white/30 bg-black/30 px-3 py-1 backdrop-blur hover:bg-black/50"
                      >
                        {activeSlide.category}
                      </button>
                      <span className="text-white/80">{activeSlide.date}</span>
                    </div>
                    <h2 className="text-xs font-semibold text-white/80 sm:text-sm md:text-lg">
                      أحدث المقالات المختارة
                    </h2>
                    <h3 className="text-xl font-bold leading-relaxed sm:text-2xl md:text-4xl">
                      {activeSlide.title}
                    </h3>
                    <p className="hidden text-sm leading-7 text-white/90 sm:block md:text-lg">
                      {activeSlide.excerpt}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Controls (Overlay) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="container h-full flex flex-col justify-end pb-4 md:pb-8">
            <div className="hidden md:flex flex-col items-end gap-3 md:ml-auto pointer-events-auto">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/مقال/${encodeURIComponent(carouselArticles[carouselIndex].slug)}`)
                    }}
                    className="rounded-[5px] border border-white/40 bg-black/40 px-5 py-2.5 text-xs font-semibold text-white shadow-sm backdrop-blur md:text-sm"
                  >
                    اقرأ المزيد
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/قسم/${encodeURIComponent(carouselArticles[carouselIndex].category || '')}`)
                    }}
                    className="rounded-[5px] border border-white/40 bg-black/40 px-5 py-2.5 text-xs font-semibold text-white shadow-sm backdrop-blur md:text-sm"
                  >
                    اقرأ في هذا القسم
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-white/70 bg-black/40 text-sm text-white shadow-sm backdrop-blur hover:bg-black/60"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-white/70 bg-black/40 text-sm text-white shadow-sm backdrop-blur hover:bg-black/60"
                  >
                    ›
                  </button>
                  <div className="flex items-center gap-1">
                    {carouselArticles.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          scrollToSlide(index)
                        }}
                        className={`h-1.5 rounded-full transition-all ${
                          index === carouselIndex
                            ? 'w-6 bg-white'
                            : 'w-2 bg-white/40 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                </div>
            </div>
            
            {/* Mobile Controls */}
            <div className="flex flex-col items-start gap-3 md:hidden pointer-events-auto">
              <div className="flex flex-wrap justify-start gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/مقال/${encodeURIComponent(carouselArticles[carouselIndex].slug)}`)
                  }}
                  className="rounded-[5px] border border-white/40 bg-black/40 px-4 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur"
                >
                  اقرأ المزيد
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/قسم/${encodeURIComponent(carouselArticles[carouselIndex].category || '')}`)
                  }}
                  className="rounded-[5px] border border-white/40 bg-black/40 px-4 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur"
                >
                  اقرأ في هذا القسم
                </button>
              </div>
              
              {/* Mobile Navigation Arrows */}
              <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-white/70 bg-black/40 text-sm text-white shadow-sm backdrop-blur hover:bg-black/60"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-white/70 bg-black/40 text-sm text-white shadow-sm backdrop-blur hover:bg-black/60"
                  >
                    ›
                  </button>
                  <div className="flex items-center gap-1">
                    {carouselArticles.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          scrollToSlide(index)
                        }}
                        className={`h-1.5 rounded-full transition-all ${
                          index === carouselIndex
                            ? 'w-6 bg-white'
                            : 'w-2 bg-white/40 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
              </div>
            </div>
          </div>
        </div>

      </section>

      <section className="container space-y-6">
        {categories.map((cat) => {
          const list = sortedArticles.filter((a) => a.category === cat).slice(0, 15)
          if (!list.length) return null
          return (
            <div key={cat} className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate(`/قسم/${encodeURIComponent(cat)}`)}
                  className="text-base font-semibold hover:text-primary"
                >
                  {cat}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/قسم/${encodeURIComponent(cat)}`)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  اكتشف المزيد
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
                        <div className="absolute right-2 top-2 rounded-[5px] border border-white/30 bg-black/40 px-2 py-1 text-[11px] text-white/90 backdrop-blur">
                          {article.date}
                        </div>
                        <div className="absolute inset-x-2 bottom-2">
                          <div className="space-y-1 rounded-[5px] border border-white/20 bg-black/50 px-3 py-2 text-white backdrop-blur-md">
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
        })}
      </section>
    </div>
  )
}
