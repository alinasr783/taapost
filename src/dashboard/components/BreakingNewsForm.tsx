import { useState, useEffect } from 'react'
import { supabase, type Article, type Category, type BreakingNewsHero } from '../../lib/supabase'
import { Search, X, AlertTriangle } from 'lucide-react'
import { useToast } from './Toast'

type Props = {
  existing?: BreakingNewsHero | null
  categories: Category[]
  onSave: () => void
  onCancel: () => void
}

export default function BreakingNewsForm({ existing, categories, onSave, onCancel }: Props) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<number | ''>(existing?.articles?.category_id || '')
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(existing?.articles || null)
  const [search, setSearch] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [loadingArticles, setLoadingArticles] = useState(false)

  useEffect(() => {
    if (selectedCategory !== '') {
      fetchArticles()
    } else {
      setArticles([])
      setSelectedArticle(null)
    }
  }, [selectedCategory])

  const fetchArticles = async () => {
    setLoadingArticles(true)
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, slug, title, excerpt, image, category_id, type, date, is_exclusive')
        .eq('category_id', selectedCategory)
        .neq('type', 'article')
        .order('date', { ascending: false })
        .limit(50)

      if (error) throw error
      setArticles((data || []) as Article[])
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoadingArticles(false)
    }
  }

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.excerpt?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    if (!selectedArticle) {
      return showToast('يجب اختيار خبر عاجل', 'error')
    }

    setSaving(true)
    try {
      if (existing) {
        const { error } = await supabase
          .from('breaking_news_hero')
          .update({ article_id: selectedArticle.id })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('breaking_news_hero')
          .insert([{ article_id: selectedArticle.id, is_active: true, display_order: 0 }])
        if (error) throw error
      }

      showToast(existing ? 'تم تحديث الخبر العاجل' : 'تم إضافة الخبر العاجل')
      onSave()
    } catch (error) {
      console.error('Error saving breaking news:', error)
      showToast('حدث خطأ أثناء الحفظ', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-amber-600">
        <AlertTriangle size={20} />
        <span className="font-medium">
          {existing ? 'تعديل الخبر العاجل' : 'إضافة خبر عاجل جديد'}
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">اختر القسم</label>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(Number(e.target.value) || '')
            setSelectedArticle(null)
          }}
          className="w-full p-2 bg-background border border-input rounded-md"
        >
          <option value="">اختر القسم...</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {selectedCategory !== '' && (
        <div>
          <label className="block text-sm font-medium mb-1">اختر الخبر</label>
          <div className="relative mb-2">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
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

          <div className="max-h-48 overflow-y-auto border border-border rounded-md">
            {loadingArticles ? (
              <div className="p-3 text-center text-sm text-muted-foreground">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                {search ? 'لا توجد نتائج' : 'لا يوجد محتوى في هذا القسم'}
              </div>
            ) : (
              filtered.map(article => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => setSelectedArticle(article)}
                  className={`w-full flex items-center gap-3 p-3 text-right transition-colors border-b border-border/50 last:border-0 ${
                    selectedArticle?.id === article.id
                      ? 'bg-primary/10'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="w-10 h-8 rounded overflow-hidden bg-muted shrink-0">
                    {article.image ? (
                      <img src={article.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">صورة</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{article.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(article.date).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                  <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedArticle?.id === article.id
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border'
                  }`}>
                    {selectedArticle?.id === article.id && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {selectedArticle && (
        <div className="bg-muted/30 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">الخبر المحدد:</p>
          <div className="flex items-center gap-3">
            {selectedArticle.image && (
              <div className="w-16 h-12 rounded overflow-hidden shrink-0">
                <img src={selectedArticle.image} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-sm font-medium text-foreground">{selectedArticle.title}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-md"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !selectedArticle}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : existing ? 'تحديث' : 'إضافة'}
        </button>
      </div>
    </div>
  )
}
