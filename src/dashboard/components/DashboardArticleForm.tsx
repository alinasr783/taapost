import { useState, useEffect } from 'react'
import { X, Save, Image as ImageIcon } from 'lucide-react'
import { supabase, type Article, type Category, type User, type UserPermission } from '../../lib/supabase'
import { hasPermission } from '../utils'
import ImageUpload from './ImageUpload'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

type Props = {
  article: Article | null
  categories: Category[]
  user: User | null
  permissions: UserPermission[]
  onClose: () => void
  onSuccess: () => void
}

export default function DashboardArticleForm({ article, categories, user, permissions, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category_id: 0,
    image: '',
    type: 'article',
    date: new Date().toISOString().split('T')[0]
  })

  // Helper to decode HTML entities
  const decodeHtml = (html: string) => {
    const txt = document.createElement('textarea')
    txt.innerHTML = html
    return txt.value
  }

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || '',
        content: decodeHtml(article.content || ''),
        category_id: article.category_id,
        image: article.image || '',
        type: article.type || 'article',
        date: article.date || new Date().toISOString().split('T')[0]
      })
    } else {
      // Set default category if available
      const availableCategories = categories.filter(c => 
        user?.is_superadmin || permissions.some(p => p.category_id === c.id && p.can_add)
      )
      if (availableCategories.length > 0) {
        setFormData(prev => ({ ...prev, category_id: availableCategories[0].id }))
      }
    }
  }, [article, categories, user, permissions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Permission check
    const action = article ? 'edit' : 'add'
    if (!hasPermission(user, permissions, formData.category_id, action)) {
      alert('ليس لديك صلاحية للقيام بهذا الإجراء في هذا القسم')
      return
    }

    setLoading(true)
    try {
      // Check for unique slug
      const { data: existingSlug } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', formData.slug)
        .single()
      
      if (existingSlug && (!article || existingSlug.id !== article.id)) {
        alert('هذا الرابط (Slug) مستخدم بالفعل، يرجى تغييره')
        setLoading(false)
        return
      }

      const dataToSave = {
        ...formData,
      }

      let error
      if (article) {
        const { error: updateError } = await supabase
          .from('articles')
          .update(dataToSave)
          .eq('id', article.id)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('articles')
          .insert([dataToSave])
        error = insertError
      }

      if (error) throw error

      onSuccess()
    } catch (err: any) {
      console.error('Error saving article:', err)
      alert('حدث خطأ أثناء حفظ المقال: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter categories for dropdown based on permission
  const availableCategories = categories.filter(c => {
    if (user?.is_superadmin) return true
    // For editing, allow current category even if permission lost (edge case)
    // But generally check 'add' permission for new, 'edit' for existing
    // Actually, when editing, you might want to change category. 
    // You should only be able to move it to a category you have 'add' permission for?
    // Let's simplify: show all categories user has 'add' permission for (if new) or 'edit' (if existing)
    // Actually, user needs 'edit' on the current article's category to open this form.
    // To change category, they need 'add' on the new category.
    // This is getting complex. Let's just list categories they have ANY permission on.
    return permissions.some(p => p.category_id === c.id)
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
          <h2 className="text-xl font-bold text-foreground">{article ? 'تعديل مقال' : 'إضافة مقال جديد'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">العنوان</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => {
                    const title = e.target.value;
                    setFormData(prev => ({
                        ...prev,
                        title,
                        slug: article ? prev.slug : title.trim().replace(/\s+/g, '-')
                    }))
                }}
                className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">الرابط (Slug)</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full p-2 bg-muted/50 border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">القسم</label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
              >
                <option value={0} disabled>اختر القسم</option>
                {availableCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">التاريخ</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
              />
            </div>
          </div>

          <div>
            <ImageUpload
              value={formData.image}
              onChange={(url) => setFormData({ ...formData, image: url })}
              label="صورة المقال"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">مقتطف (Excerpt)</label>
            <textarea
              rows={3}
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
            />
          </div>

          <div className="min-h-[300px]">
            <label className="block text-sm font-medium text-foreground mb-1">المحتوى</label>
            <div className="bg-background text-foreground">
              <ReactQuill
                theme="snow"
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                className="h-64 mb-12"
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                    ['link', 'image'],
                    ['clean']
                  ],
                }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              <Save size={18} />
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
