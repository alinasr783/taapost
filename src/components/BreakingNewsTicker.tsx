import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import type { BreakingNewsHero as BreakingNewsHeroType } from '../lib/supabase'

type Props = {
  items: BreakingNewsHeroType[]
}

function postUrl(article: NonNullable<BreakingNewsHeroType['articles']>) {
  const base = article.type === 'article' ? '/article/' : '/post/'
  return `${base}${article.id}`
}

export default function BreakingNewsTicker({ items }: Props) {
  const navigate = useNavigate()
  const active = items.filter(i => i.articles)
  if (active.length === 0) return null

  return (
    <div className="w-full bg-gradient-to-l from-red-600 to-red-700 text-white shadow-sm">
      <div className="flex items-stretch min-h-[40px]">
        <div className="flex items-center gap-1.5 bg-black/25 px-3 sm:px-4 py-2 font-bold text-[11px] sm:text-sm whitespace-nowrap shrink-0">
          <AlertTriangle size={14} className="shrink-0" />
          <span>خبر عاجل</span>
        </div>

        <div className="ticker-viewport relative flex-1 overflow-hidden" dir="ltr">
          <div className="ticker-track flex items-center gap-8 sm:gap-12 h-full py-2 px-4 whitespace-nowrap will-change-transform">
            {[...active, ...active].map((item, idx) => (
              <button
                key={`${item.id}-${idx}`}
                type="button"
                onClick={() => navigate(postUrl(item.articles!))}
                className="text-[11px] sm:text-sm font-medium hover:underline underline-offset-2 whitespace-nowrap"
              >
                {item.articles!.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
