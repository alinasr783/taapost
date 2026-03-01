import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { supabase, type Category, type Article } from '../lib/supabase'

export default function CategoryPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const categorySlug = slug ? decodeURIComponent(slug) : ''
  
  const [category, setCategory] = useState<Category | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!categorySlug) return
      setLoading(true)
      try {
        // Fetch category by slug
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', categorySlug)
          .maybeSingle()
        
        if (catError) {
          console.error('Error fetching category:', catError)
        } 
        
        if (catData) {
          setCategory(catData)
          
          // Fetch articles for this category
          const { data: artData, error: artError } = await supabase
            .from('articles')
            .select('*')
            .eq('category_id', catData.id)
            .order('date', { ascending: false })
            
          if (artError) {
             console.error('Error fetching articles:', artError)
          } else if (artData) {
            setArticles(artData)
          }
        } else {
           setCategory(null)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [categorySlug])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!category) {
    return (
      <div className="container flex flex-col items-center justify-center py-20 text-center">
        <h2 className="mb-4 text-2xl font-bold text-foreground">عذراً، القسم غير موجود</h2>
        <button 
          onClick={() => navigate('/')}
          className="rounded-[5px] bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90"
        >
          العودة للرئيسية
        </button>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <button 
          onClick={() => navigate('/')}
          className="mb-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          <span>الرئيسية</span>
        </button>
        
        <div className="rounded-[5px] border border-border/40 bg-card/30 p-6 backdrop-blur-sm md:p-8 text-center md:text-right">
          <h1 className="text-3xl font-bold mb-3">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground text-lg">{category.description}</p>
          )}
        </div>
      </div>

      {/* Articles Grid */}
      <div>
        <h2 className="text-xl font-bold mb-6 border-b border-border/40 pb-2">مقالات القسم</h2>
        
        {articles.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((i) => (
              <button
                key={i.id}
                onClick={() => navigate(`/مقال/${encodeURIComponent(i.slug)}`)}
                className="relative flex flex-col overflow-hidden rounded-[5px] border border-white/10 bg-black/30 text-right shadow-sm backdrop-blur-md hover:border-white/20 transition-colors w-full"
              >
                <div className="relative h-56 w-full">
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
                      {!i.is_exclusive && (
                        <div className="text-[10px] text-white/70">
                          {new Date(i.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      )}
                      <div className="line-clamp-2 text-sm font-semibold">
                        {i.title}
                      </div>
                      <div className="line-clamp-2 text-[11px] text-white/85">
                        {i.excerpt}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-[5px]">
            لا توجد مقالات في هذا القسم حالياً
          </div>
        )}
      </div>
    </div>
  )
}

