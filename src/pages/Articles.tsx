import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, type Article } from '../lib/supabase'

export default function Articles() {
  const [params] = useSearchParams()
  const q = params.get('q')?.trim() || ''
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .order('date', { ascending: false })

        if (error) {
          console.error('Error fetching articles:', error)
        }
        
        if (data) {
          setArticles(data as Article[])
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const list = useMemo(() => {
    const sorted = [...articles].sort((a, b) => (a.date < b.date ? 1 : -1))
    if (!q) return sorted
    const t = q.toLowerCase()
    return sorted.filter(
      (i) => i.title.toLowerCase().includes(t) || (i.excerpt && i.excerpt.toLowerCase().includes(t))
    )
  }, [q, articles])

  if (loading) {
    return (
      <div className="container py-8 space-y-4">
        <h1 className="mb-4 text-2xl font-bold">المقالات</h1>
        <div className="text-center py-10">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-4">
      <h1 className="mb-4 text-2xl font-bold">المقالات</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {list.map((i) => (
          <a
            key={i.slug}
            href={`/مقال/${encodeURIComponent(i.slug)}`}
            className="relative flex flex-col overflow-hidden rounded-[5px] border border-white/10 bg-black/30 text-right shadow-sm backdrop-blur-md"
          >
            <div className="relative h-52 w-full">
              <img
                src={i.image}
                alt={i.title}
                className="h-full w-full object-cover"
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
          </a>
        ))}
      </div>
      {list.length === 0 && <div className="text-muted-foreground mt-6">لا توجد نتائج</div>}
    </div>
  )
}
