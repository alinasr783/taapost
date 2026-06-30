import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Search, Eye, Calendar, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { supabase, type Article, type Category, type Author, type User, type UserPermission } from '../../lib/supabase'
import { hasPermission } from '../utils'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'

const ITEMS_PER_PAGE = 15

export default function DashboardArticles() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
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
  const loadedIdsRef = useRef<Set<number>>(new Set())
  const abortRef = useRef<AbortController | null>(null)

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterCategory, setFilterCategory] = useState<number | ''>('')
  const [filterAuthor, setFilterAuthor] = useState<number | ''>('')
  const [filterType, setFilterType] = useState<string>('')

  const userCategoryIds = !user?.is_superadmin
    ? permissions.map(p => p.category_id)
    : []

  const fetchPermissions = useCallback(async (userId: number) => {
    const { data } = await supabase.from('user_permissions').select('*').eq('user_id', userId)
    if (data) setPermissions(data)
  }, [])

  const buildFetchQuery = useCallback((fromIdx: number, count: number) => {
    let query = supabase
      .from('articles')
      .select('*, categories(*), authors(*)', { count: 'exact' })

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    if (!user?.is_superadmin && userCategoryIds.length > 0) {
      query = query.in('category_id', userCategoryIds)
    }

    if (filterCategory !== '') {
      query = query.eq('category_id', filterCategory)
    }

    if (filterAuthor !== '') {
      query = query.eq('author_id', filterAuthor)
    }

    if (filterType) {
      query = query.eq('type', filterType)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setDate(toDate.getDate() + 1)
      query = query.lt('created_at', toDate.toISOString())
    }

    return query
      .order('created_at', { ascending: false })
      .range(fromIdx, fromIdx + count - 1)
  }, [search, user?.is_superadmin, userCategoryIds, filterCategory, filterAuthor, filterType, dateFrom, dateTo])

  const fetchArticles = useCallback(async (append = false) => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    if (!append) {
      setLoading(true)
      loadedIdsRef.current = new Set()
    } else {
      setLoadingMore(true)
    }

    try {
      const fromIdx = append ? articles.length : 0
      const { data, error, count } = await buildFetchQuery(fromIdx, ITEMS_PER_PAGE)

      if (error) throw error

      if (count !== null) setTotalCount(count)

      if (data) {
        const unique = data.filter(a => !loadedIdsRef.current.has(a.id))
        unique.forEach(a => loadedIdsRef.current.add(a.id))
        setArticles(prev => append ? [...prev, ...unique] : unique)
        setHasMore((count ?? 0) > fromIdx + ITEMS_PER_PAGE)
      } else {
        if (!append) setArticles([])
        setHasMore(false)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('Error fetching articles:', err)
      showToast('حدث خطأ أثناء تحميل المقالات', 'error')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [buildFetchQuery, articles.length, showToast])

  const fetchCategoriesAndAuthors = useCallback(async () => {
    const [categoriesRes, authorsRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('authors').select('*').order('name'),
    ])
    if (categoriesRes.data) setCategories(categoriesRes.data)
    if (authorsRes.data) setAuthors(authorsRes.data)
  }, [])

  useEffect(() => {
    if (user) {
      void fetchPermissions(user.id)
    }
    void fetchCategoriesAndAuthors()
    void fetchArticles(false)
  }, [user, fetchPermissions, fetchCategoriesAndAuthors, fetchArticles])

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
      setTotalCount(prev => Math.max(0, prev - 1))
      showToast('تم حذف المقال بنجاح', 'success')
    }
    setConfirmOpen(false)
    setDeleteTarget(null)
  }

  const canAdd = user?.is_superadmin || permissions.some(p => p.can_add)
  
  const clearFilters = () => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setFilterCategory('')
    setFilterAuthor('')
    setFilterType('')
  }

  const hasActiveFilters = search || dateFrom || dateTo || filterCategory !== '' || filterAuthor !== '' || filterType !== ''

  if (loading) return (
    <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-3">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>جاري التحميل...</span>
    </div>
  )

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
              onChange={(e) => { setSearch(e.target.value) }}
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
                onChange={(e) => { setDateFrom(e.target.value) }}
                className="px-2 py-1.5 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
              />
            </div>

            {/* Date To */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">إلى</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value) }}
                className="px-2 py-1.5 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value ? Number(e.target.value) : '') }}
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
              onChange={(e) => { setFilterAuthor(e.target.value ? Number(e.target.value) : '') }}
              className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
            >
              <option value="">كل الكتّاب</option>
              {authors.map(author => (
                <option key={author.id} value={author.id}>{author.name}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value) }}
              className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
            >
              <option value="">كل الأنواع</option>
              <option value="article">مقالات</option>
              <option value="other">محتوى آخر</option>
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
          {articles.map((article) => {
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
                          href={article.slug ? `${article.type === 'article' ? '/article/' : '/post/'}${encodeURIComponent(article.slug)}` : `${article.type === 'article' ? '/article/' : '/post/'}${article.id}`}
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
            {articles.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">لا توجد مقالات لعرضها</div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-muted/50 text-muted-foreground font-medium">
                <tr>
                  <th className="p-4">العنوان</th>
                  <th className="p-4">النوع</th>
                  <th className="p-4">الكاتب</th>
                  <th className="p-4">القسم</th>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {articles.map((article) => {
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
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          article.type === 'article'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {article.type === 'article' ? 'مقال' : 'آخر'}
                        </span>
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
                          href={article.slug ? `${article.type === 'article' ? '/article/' : '/post/'}${encodeURIComponent(article.slug)}` : `${article.type === 'article' ? '/article/' : '/post/'}${article.id}`}
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
                {articles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      لا توجد مقالات لعرضها
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Server-side Load More */}
          {hasMore && !loading && (
            <div className="p-4 border-t border-border flex justify-center">
              <button
                onClick={() => fetchArticles(true)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown size={18} />
                )}
                {loadingMore ? 'جاري التحميل...' : `عرض المزيد (${totalCount - articles.length} متبقي)`}
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
        onConfirm={handleDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteTarget(null) }}
      />
    </div>
  )
}
