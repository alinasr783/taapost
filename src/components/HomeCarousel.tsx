import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Article } from '../lib/supabase'

type Props = {
  articles: Article[]
}

function articleUrl(article: Article) {
  const base = article.type === 'article' ? '/article/' : '/post/'
  return article.slug ? `${base}${encodeURIComponent(article.slug)}` : `${base}${article.id}`
}

export default function HomeCarousel({ articles }: Props) {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const scrollToSlide = (index: number) => {
    if (scrollRef.current) {
      const container = scrollRef.current
      const slideWidth = container.clientWidth
      container.scrollTo({
        left: -(index * slideWidth),
        behavior: 'smooth'
      })
      setCarouselIndex(index)
    }
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextIndex = (carouselIndex + 1) % articles.length
    scrollToSlide(nextIndex)
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    const prevIndex = carouselIndex === 0 ? articles.length - 1 : carouselIndex - 1
    scrollToSlide(prevIndex)
  }
  
  const handleScroll = () => {
    if (scrollRef.current) {
      const container = scrollRef.current
      const slideWidth = container.clientWidth
      const scrollLeft = Math.abs(container.scrollLeft)
      const newIndex = Math.round(scrollLeft / slideWidth)
      if (newIndex !== carouselIndex && newIndex >= 0 && newIndex < articles.length) {
         setCarouselIndex(newIndex)
      }
    }
  }

  useEffect(() => {
    if (isPaused || articles.length === 0) return
    
    const timer = setTimeout(() => {
      const next = (carouselIndex + 1) % articles.length
      scrollToSlide(next)
    }, 3000)

    return () => clearTimeout(timer)
  }, [carouselIndex, isPaused, articles.length])

  if (articles.length === 0) return null

  return (
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
        {articles.map((slide, index) => (
          <div 
            key={slide.id} 
            className="relative w-full flex-shrink-0 snap-center h-64 sm:h-80 md:h-[380px] lg:h-[430px] cursor-pointer"
            onClick={() => navigate(articleUrl(slide))}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="h-full w-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={index === 0 ? 'high' : 'auto'}
              width={1200}
              height={430}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            {/* Controls inside each slide */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="h-full flex flex-col pb-4 md:pb-8 px-4 md:px-8 lg:px-12">
                {/* Tags at top-right */}
                <div className="flex justify-start pt-4 md:pt-6">
                  <div className="pointer-events-auto flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const categoryId = slide.categoryId ?? slide.category_id
                        navigate(`/category/${categoryId}`)
                      }}
                      className="inline-flex rounded-[5px] border border-white/30 bg-black/30 px-3 py-1 text-white backdrop-blur hover:bg-black/50"
                    >
                      {slide.category}
                    </button>
                    {slide.is_exclusive && (
                      <span className="text-red-500 font-bold bg-white/10 px-2 py-0.5 rounded backdrop-blur-sm">حصرياً</span>
                    )}
                  </div>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Desktop Bottom Section: Title + Controls */}
                <div className="hidden md:flex flex-col gap-3 pointer-events-auto">
                  <h3 className="text-xl font-bold leading-relaxed sm:text-2xl md:text-4xl text-white">
                    {slide.title}
                  </h3>
                  <div className="flex items-center justify-between">
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
                        {articles.map((item, i) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              scrollToSlide(i)
                            }}
                            className={`h-1.5 rounded-full transition-all ${
                              i === index
                                ? 'w-6 bg-white'
                                : 'w-2 bg-white/40 hover:bg-white/70'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(articleUrl(slide))
                      }}
                      className="rounded-[5px] border border-white/40 bg-black/40 px-8 py-2.5 text-xs font-semibold text-white shadow-sm backdrop-blur md:text-sm"
                    >
                      اقرأ المزيد
                    </button>
                  </div>
                </div>

                {/* Mobile Bottom Section: Title + Controls */}
                <div className="flex flex-col gap-3 md:hidden pointer-events-auto">
                  <h3 className="text-lg font-bold leading-relaxed text-right text-white">
                    {slide.title}
                  </h3>
                  <div className="flex items-center justify-between">
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
                        {articles.map((item, i) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              scrollToSlide(i)
                            }}
                            className={`h-1.5 rounded-full transition-all ${
                              i === index
                                ? 'w-6 bg-white'
                                : 'w-2 bg-white/40 hover:bg-white/70'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(articleUrl(slide))
                      }}
                      className="rounded-[5px] border border-white/40 bg-black/40 px-6 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur"
                    >
                      اقرأ المزيد
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
