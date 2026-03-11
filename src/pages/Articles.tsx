import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase, type Article } from '../lib/supabase'

export default function Articles() {
  const [params] = useSearchParams()
  const q = params.get('q')?.trim() || ''

  type ArticleCard = Pick<
    Article,
    'id' | 'title' | 'excerpt' | 'image' | 'date' | 'is_exclusive'
  >

  const normalizedQ = useMemo(() => q.replaceAll(',', ' ').trim(), [q])
  const limit = 40

  const articlesQuery = useQuery({
    queryKey: ['articles_list', { q: normalizedQ, limit }],
    queryFn: async () => {
      let query = supabase
        .from('articles')
        .select('id,title,excerpt,image,date,is_exclusive')
        .order('date', { ascending: false })
        .limit(limit)

      if (normalizedQ) {
        const pattern = `%${normalizedQ}%`
        query = query.or(`title.ilike.${pattern},excerpt.ilike.${pattern}`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as ArticleCard[]
    },
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  })

  const list = articlesQuery.data ?? []

  if (articlesQuery.isLoading) {
    return (
      <div className="container py-8 space-y-4">
        <h1 className="mb-4 text-2xl font-bold">المقالات</h1>
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="relative overflow-hidden rounded-[5px] border border-border/40 bg-muted/20 shadow-sm"
            >
              <div className="h-52 w-full animate-pulse bg-muted/40" />
              <div className="absolute inset-x-2 bottom-2 space-y-2 rounded-[5px] border border-border/30 bg-background/60 px-3 py-2 backdrop-blur-[2px]">
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted/50" />
                <div className="h-3 w-4/6 animate-pulse rounded bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-4">
      <h1 className="mb-4 text-2xl font-bold">المقالات</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {list.map((i) => (
          <Link
            key={i.id}
            to={`/post/${i.id}`}
            className="relative flex flex-col overflow-hidden rounded-[5px] border border-white/10 bg-black/30 text-right shadow-sm backdrop-blur-md"
          >
            <div className="relative h-52 w-full">
              <img
                src={i.image}
                alt={i.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
              {i.is_exclusive && (
                <div className="absolute right-2 top-2 rounded-[5px] border border-white/30 bg-red-600/80 px-2 py-1 text-[11px] text-white/90 backdrop-blur font-bold">
                  حصرياً
                </div>
              )}
              <div className="absolute inset-x-2 bottom-2">
                <div className="space-y-1 rounded-[5px] border border-white/20 bg-black/50 px-3 py-2 text-white backdrop-blur-md">
                  <div className="line-clamp-2 text-sm font-semibold">
                    {i.title}
                  </div>
                  <div className="line-clamp-2 text-[11px] text-white/85">
                    {i.excerpt}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {list.length === 0 && <div className="text-muted-foreground mt-6">لا توجد نتائج</div>}
    </div>
  )
}
