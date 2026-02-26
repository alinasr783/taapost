import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react'
import { supabase, type Article, type Category, type User, type UserPermission } from '../../lib/supabase'
import { hasPermission } from '../utils'
import DashboardArticleForm from '../components/DashboardArticleForm'

export default function DashboardArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<UserPermission[]>([])

  const fetchPermissions = async (userId: number) => {
    const { data } = await supabase.from('user_permissions').select('*').eq('user_id', userId)
    if (data) setPermissions(data)
  }

  const fetchData = async () => {
    setLoading(true)
    const [articlesRes, categoriesRes] = await Promise.all([
      supabase.from('articles').select('*, categories(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*')
    ])

    if (articlesRes.data) setArticles(articlesRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)
    setLoading(false)
  }

  useEffect(() => {
    const storedUser = localStorage.getItem('dashboard_user')
    if (storedUser) {
      const u = JSON.parse(storedUser)
      setUser(u)
      fetchPermissions(u.id)
    }
    fetchData()
  }, [])

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المقال؟')) return

    const { error } = await supabase.from('articles').delete().eq('id', id)
    if (error) {
      alert('حدث خطأ أثناء الحذف')
    } else {
      setArticles(articles.filter(a => a.id !== id))
    }
  }

  const canAdd = user?.is_superadmin || permissions.some(p => p.can_add)
  
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(search.toLowerCase())
    if (user?.is_superadmin) return matchesSearch
    
    // Check if user has permission for this category
    // Assuming if they have ANY permission on the category, they can view it in the list
    // Or maybe they can only view articles they can edit/delete?
    // Let's allow viewing all articles for now, but restrict actions.
    // Or better: filter list to only show categories they have access to?
    // User requirement: "Determine the category or categories the user can publish in".
    // It doesn't explicitly say they can't SEE other articles.
    // But usually dashboards restrict visibility.
    // Let's restrict visibility to assigned categories.
    const userCategoryIds = permissions.map(p => p.category_id)
    const matchesCategory = userCategoryIds.includes(article.category_id)
    return matchesSearch && matchesCategory
  })

  if (loading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">إدارة المقالات</h1>
        {canAdd && (
          <button
            onClick={() => {
              setEditingArticle(null)
              setIsFormOpen(true)
            }}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />
            <span>إضافة مقال</span>
          </button>
        )}
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border mb-6">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="بحث في المقالات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-muted/50 text-muted-foreground font-medium">
              <tr>
                <th className="p-4">العنوان</th>
                <th className="p-4">القسم</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredArticles.map((article) => {
                const canEdit = user && hasPermission(user, permissions, article.category_id, 'edit')
                const canDelete = user && hasPermission(user, permissions, article.category_id, 'delete')

                return (
                  <tr key={article.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{article.title}</td>
                    <td className="p-4">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                        {categories.find(c => c.id === article.category_id)?.name || article.category_id}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">{new Date(article.created_at || article.date).toLocaleDateString('ar-EG')}</td>
                    <td className="p-4 flex gap-2">
                      <a
                        href={`/مقال/${article.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        title="عرض"
                      >
                        <Eye size={18} />
                      </a>
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditingArticle(article)
                            setIsFormOpen(true)
                          }}
                          className="p-2 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="تعديل"
                        >
                          <Edit size={18} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(article.id)}
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
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    لا توجد مقالات لعرضها
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <DashboardArticleForm
          key={editingArticle ? editingArticle.id : 'new'}
          article={editingArticle}
          categories={categories}
          user={user}
          permissions={permissions}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}
