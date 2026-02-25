import { useState, useEffect } from 'react'
import { supabase, type Category } from '../lib/supabase'

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
        
        if (error) {
          console.error('Error fetching categories:', error)
        }
        
        if (data) {
          setCategories(data as Category[])
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="mb-4 text-2xl font-bold">الأقسام</h1>
        <div className="text-center py-10">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="mb-4 text-2xl font-bold">الأقسام</h1>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <a
            key={c.slug}
            href={`/قسم/${encodeURIComponent(c.slug)}`}
            className="flex flex-col overflow-hidden rounded-[5px] border border-white/10 bg-background/10 shadow-sm backdrop-blur-md hover:bg-background/20"
          >
            <img
              src={c.image}
              alt={c.name}
              className="h-40 w-full object-cover"
            />
            <div className="space-y-2 px-4 py-3 text-right">
              <div className="text-sm font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground">
                {c.description}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
