import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Article } from '../lib/supabase'

type Props = {
  articles: Article[]
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
        {articles.map((activeSlide) => (
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
                    {activeSlide.is_exclusive && (
                      <span className="text-red-500 font-bold bg-white/10 px-2 py-0.5 rounded backdrop-blur-sm">حصرياً</span>
                    )}
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
                    navigate(`/مقال/${encodeURIComponent(articles[carouselIndex].slug)}`)
                  }}
                  className="rounded-[5px] border border-white/40 bg-black/40 px-5 py-2.5 text-xs font-semibold text-white shadow-sm backdrop-blur md:text-sm"
                >
                  اقرأ المزيد
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/قسم/${encodeURIComponent(articles[carouselIndex].category || '')}`)
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
                  {articles.map((item, index) => (
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
                  navigate(`/مقال/${encodeURIComponent(articles[carouselIndex].slug)}`)
                }}
                className="rounded-[5px] border border-white/40 bg-black/40 px-4 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur"
              >
                اقرأ المزيد
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/قسم/${encodeURIComponent(articles[carouselIndex].category || '')}`)
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
                  {articles.map((item, index) => (
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
  )
}
