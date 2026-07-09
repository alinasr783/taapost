import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import type { BreakingNewsHero as BreakingNewsHeroType } from '../lib/supabase'

type Props = {
  data: BreakingNewsHeroType
}

function postUrl(article: NonNullable<BreakingNewsHeroType['articles']>) {
  const base = article.type === 'article' ? '/article/' : '/post/'
  return `${base}${article.id}`
}

export default function BreakingNewsHero({ data }: Props) {
  const navigate = useNavigate()
  const article = data.articles
  if (!article) return null

  return (
    <section
      className="relative w-full cursor-pointer group overflow-hidden rounded-lg"
      onClick={() => navigate(postUrl(article))}
    >
      <div className="relative h-64 sm:h-80 md:h-[340px]">
        <img
          src={article.image}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="eager"
          fetchPriority="high"
          width={1200}
          height={340}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-8 lg:p-12">
          {/* Breaking News Tag */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 bg-red-600 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wide">
              <AlertTriangle size={14} />
              خبر عاجل
            </span>
            {article.categories?.name && (
              <span className="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded text-xs font-medium">
                {article.categories.name}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-relaxed mb-2">
            {article.title}
          </h2>

          {/* Date */}
          <p className="text-sm text-white/70">
            {new Date(article.date).toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
    </section>
  )
}
