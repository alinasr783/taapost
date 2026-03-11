import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase, type Category } from '../lib/supabase'

export default function Categories() {
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('order_index', { ascending: true })
      if (error) throw error
      return (data ?? []) as Category[]
    },
    staleTime: 5 * 60_000,
  })

  if (categoriesQuery.isLoading) {
    return (
      <div className="container py-8">
        <h1 className="mb-4 text-2xl font-bold">الأقسام</h1>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="flex flex-col overflow-hidden rounded-[5px] border border-border/40 bg-muted/20 shadow-sm"
            >
              <div className="h-40 w-full bg-muted/40 animate-pulse" />
              <div className="space-y-2 px-4 py-3">
                <div className="h-4 w-1/2 rounded bg-muted/50 animate-pulse" />
                <div className="h-3 w-5/6 rounded bg-muted/40 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const categories = categoriesQuery.data ?? []

  return (
    <div className="container py-8">
      <h1 className="mb-4 text-2xl font-bold">الأقسام</h1>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.id}
            to={`/category/${c.id}`}
            className="flex flex-col overflow-hidden rounded-[5px] border border-white/10 bg-background/10 shadow-sm backdrop-blur-md hover:bg-background/20"
          >
            <img
              src={c.image}
              alt={c.name}
              className="h-40 w-full object-cover"
              loading="lazy"
            />
            <div className="space-y-2 px-4 py-3 text-right">
              <div className="text-sm font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground">
                {c.description}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
