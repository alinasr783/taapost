import { useState, useEffect } from 'react'
import { supabase, type Article, type Category } from '../../lib/supabase'
import { Search, Plus, X } from 'lucide-react'

type Props = {
  categoryId: number
  selectedIds: number[]
  onSelect: (articles: Article[]) => void
  maxCount?: number
}

export default function PostPicker({ categoryId, selectedIds, onSelect, maxCount = 20 }: Props) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category | null>(null)

  useEffect(() => {
    fetchArticles()
  }, [categoryId])

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const [articlesRes, catRes] = await Promise.all([
        supabase
          .from('articles')
          .select('id, slug, title, excerpt, image, category_id, type, date, is_exclusive')
          .eq('category_id', categoryId)
          .neq('type', 'article')
          .order('date', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('id', categoryId)
          .single()
      ])

      if (articlesRes.data) setArticles(articlesRes.data as Article[])
      if (catRes.data) setCategory(catRes.data as Category)
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.excerpt?.toLowerCase().includes(search.toLowerCase())
  )

  const isSelected = (id: number) => selectedIds.includes(id)

  const handleToggle = (article: Article) => {
    if (isSelected(article.id)) {
      onSelect(articles.filter(a => selectedIds.includes(a.id) && a.id !== article.id))
    } else {
      if (selectedIds.length >= maxCount) return
      onSelect([...articles.filter(a => selectedIds.includes(a.id)), article])
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-muted/30 p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-foreground">
            {category?.name || 'محتوى القسم'}
          </h4>
          <span className="text-xs text-muted-foreground">
            {selectedIds.length} / {maxCount} محدد
          </span>
        </div>
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في المقالات..."
            className="w-full pr-9 pl-3 py-2 text-sm bg-background border border-input rounded-md"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {search ? 'لا توجد نتائج' : 'لا يوجد محتوى في هذا القسم'}
          </div>
        ) : (
          filtered.map(article => (
            <button
              key={article.id}
              type="button"
              onClick={() => handleToggle(article)}
              className={`w-full flex items-center gap-3 p-3 text-right transition-colors border-b border-border/50 last:border-0 ${
                isSelected(article.id)
                  ? 'bg-primary/10'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className="w-12 h-9 rounded overflow-hidden bg-muted shrink-0">
                {article.image ? (
                  <img src={article.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">صورة</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{article.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(article.date).toLocaleDateString('ar-EG')}
                  {article.is_exclusive && <span className="text-red-600 mr-1">حصرياً</span>}
                </p>
              </div>
              <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSelected(article.id)
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-border'
              }`}>
                {isSelected(article.id) && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
