import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Search, Eye, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase, type Article, type Category, type Author, type User, type UserPermission } from '../../lib/supabase'
import { hasPermission } from '../utils'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'

const ITEMS_PER_PAGE = 10

export default function DashboardArticles() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [user] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('dashboard_user')
    if (!storedUser) return null
    try {
      const parsed: unknown = JSON.parse(storedUser)
      if (typeof parsed !== 'object' || parsed === null) return null
      const u = parsed as Partial<User>
      if (typeof u.id !== 'number') return null
      if (typeof u.username !== 'string') return null
      if (typeof u.is_superadmin !== 'boolean') return null
      if (typeof u.created_at !== 'string') return null
      return u as User
    } catch {
      return null
    }
  })
  const [permissions, setPermissions] = useState<UserPermission[]>([])

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterCategory, setFilterCategory] = useState<number | ''>('')
  const [filterAuthor, setFilterAuthor] = useState<number | ''>('')
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)

  const fetchPermissions = async (userId: number) => {
    const { data } = await supabase.from('user_permissions').select('*').eq('user_id', userId)
    if (data) setPermissions(data)
  }

  const fetchData = async () => {
    setLoading(true)
    const [articlesRes, categoriesRes, authorsRes] = await Promise.all([
      supabase.from('articles').select('*, categories(*), authors(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*'),
      supabase.from('authors').select('*'),
    ])

    if (articlesRes.data) setArticles(articlesRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)
    if (authorsRes.data) setAuthors(authorsRes.data)
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => {
      if (user) {
        void fetchPermissions(user.id)
      }
      void fetchData()
    })
  }, [user])

  const openDeleteConfirm = (id: number) => {
    setDeleteTarget(id)
    setConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (deleteTarget === null) return

    const { error } = await supabase.from('articles').delete().eq('id', deleteTarget)
    if (error) {
      showToast('حدث خطأ أثناء الحذف', 'error')
    } else {
      setArticles(articles.filter(a => a.id !== deleteTarget))
      showToast('تم حذف المقال بنجاح', 'success')
    }
    setConfirmOpen(false)
    setDeleteTarget(null)
  }

  const canAdd = user?.is_superadmin || permissions.some(p => p.can_add)
  
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(search.toLowerCase())
    
    if (!user?.is_superadmin) {
      const userCategoryIds = permissions.map(p => p.category_id)
      if (!userCategoryIds.includes(article.category_id)) return false
    }

    // Date filter
    if (dateFrom || dateTo) {
      const articleDate = new Date(article.created_at || article.date)
      if (dateFrom) {
        const from = new Date(dateFrom)
        if (articleDate < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setDate(to.getDate() + 1)
        if (articleDate >= to) return false
      }
    }

    // Category filter
    if (filterCategory !== '' && article.category_id !== filterCategory) return false

    // Author filter
    if (filterAuthor !== '' && article.author_id !== filterAuthor) return false

    return matchesSearch
  })

  const visibleArticles = filteredArticles.slice(0, visibleCount)
  const hasMore = visibleCount < filteredArticles.length

  const clearFilters = () => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setFilterCategory('')
    setFilterAuthor('')
    setVisibleCount(ITEMS_PER_PAGE)
  }

  const hasActiveFilters = search || dateFrom || dateTo || filterCategory !== '' || filterAuthor !== ''

  if (loading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">إدارة المقالات</h1>
        {canAdd && (
          <button
            onClick={() => navigate('/dashboard/articles/new')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />
            <span>إضافة مقال</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-sm border border-border mb-6">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="بحث في المقالات..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisibleCount(ITEMS_PER_PAGE) }}
              className="w-full pr-10 pl-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        
        <div className="p-4 border-b border-border">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date From */}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setVisibleCount(ITEMS_PER_PAGE) }}
                className="px-2 py-1.5 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
              />
            </div>

            {/* Date To */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">إلى</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setVisibleCount(ITEMS_PER_PAGE) }}
                className="px-2 py-1.5 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value ? Number(e.target.value) : ''); setVisibleCount(ITEMS_PER_PAGE) }}
              className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
            >
              <option value="">كل الأقسام</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* Author Filter */}
            <select
              value={filterAuthor}
              onChange={(e) => { setFilterAuthor(e.target.value ? Number(e.target.value) : ''); setVisibleCount(ITEMS_PER_PAGE) }}
              className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
            >
              <option value="">كل الكتّاب</option>
              {authors.map(author => (
                <option key={author.id} value={author.id}>{author.name}</option>
              ))}
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border">
          {visibleArticles.map((article) => {
            const canEdit = user && hasPermission(user, permissions, article.category_id, 'edit')
            const canDelete = user && hasPermission(user, permissions, article.category_id, 'delete')

            return (
              <div key={article.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground line-clamp-2">
                      {article.title}
                      {article.is_exclusive && (
                        <span className="mr-2 inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                          حصري
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {article.authors && (
                        <span className="bg-purple-500/10 text-purple-600 px-2 py-1 rounded">
                          {article.authors.name}
                        </span>
                      )}
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                        {categories.find(c => c.id === article.category_id)?.name || article.category_id}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(article.created_at || article.date).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                      <a
                        href={article.slug ? `/post/${encodeURIComponent(article.slug)}` : `/post/${article.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        title="عرض"
                      >
                        <Eye size={18} />
                      </a>
                      {canEdit && (
                        <button
                          onClick={() => navigate(`/dashboard/articles/edit/${article.id}`)}
                          className="p-2 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="تعديل"
                        >
                          <Edit size={18} />
                        </button>
                      )}
                      {canDelete && (
                          <button
                          onClick={() => openDeleteConfirm(article.id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {filteredArticles.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">لا توجد مقالات لعرضها</div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-muted/50 text-muted-foreground font-medium">
                <tr>
                  <th className="p-4">العنوان</th>
                  <th className="p-4">الكاتب</th>
                  <th className="p-4">القسم</th>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleArticles.map((article) => {
                  const canEdit = user && hasPermission(user, permissions, article.category_id, 'edit')
                  const canDelete = user && hasPermission(user, permissions, article.category_id, 'delete')

                  return (
                    <tr key={article.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium text-foreground">
                        {article.title}
                        {article.is_exclusive && (
                          <span className="mr-2 inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                            حصري
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {article.authors ? (
                          <span className="bg-purple-500/10 text-purple-600 px-2 py-1 rounded text-sm">
                            {article.authors.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                          {categories.find(c => c.id === article.category_id)?.name || article.category_id}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{new Date(article.created_at || article.date).toLocaleDateString('ar-EG')}</td>
                      <td className="p-4 flex gap-2">
                        <a
                          href={`/post/${article.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="عرض"
                        >
                          <Eye size={18} />
                        </a>
                        {canEdit && (
                          <button
                            onClick={() => navigate(`/dashboard/articles/edit/${article.id}`)}
                            className="p-2 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="تعديل"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => openDeleteConfirm(article.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredArticles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      لا توجد مقالات لعرضها
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="p-4 border-t border-border flex justify-center">
              <button
                onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                className="flex items-center gap-2 px-6 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors font-medium"
              >
                <ChevronDown size={18} />
                عرض المزيد ({filteredArticles.length - visibleCount} متبقي)
              </button>
            </div>
          )}

          {/* Show Less Button */}
          {visibleCount > ITEMS_PER_PAGE && (
            <div className="p-4 border-t border-border flex justify-center">
              <button
                onClick={() => setVisibleCount(ITEMS_PER_PAGE)}
                className="flex items-center gap-2 px-6 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors font-medium"
              >
                <ChevronUp size={18} />
                عرض أقل
              </button>
            </div>
          )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="حذف المقال"
        message="هل أنت متأكد من حذف هذا المقال؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteTarget(null) }}
      />
    </div>
  )
}
