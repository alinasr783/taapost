import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Search, Save, X, User } from 'lucide-react'
import { supabase, type Author } from '../../lib/supabase'
import ImageUpload from '../components/ImageUpload'

export default function DashboardAuthors() {
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Author>>({})

  useEffect(() => {
    fetchAuthors()
  }, [])

  async function fetchAuthors() {
    try {
      const { data, error } = await supabase
        .from('authors')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      if (data) setAuthors(data)
    } catch (error) {
      console.error('Error fetching authors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (formData.id) {
        const { error } = await supabase
          .from('authors')
          .update({
            name: formData.name,
            image: formData.image,
            bio: formData.bio,
            role: formData.role
          })
          .eq('id', formData.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('authors')
          .insert([{
            name: formData.name,
            image: formData.image,
            bio: formData.bio,
            role: formData.role
          }])
        
        if (error) throw error
      }

      setIsFormOpen(false)
      setEditingAuthor(null)
      setFormData({})
      fetchAuthors()
    } catch (error) {
      console.error('Error saving author:', error)
      alert('حدث خطأ أثناء الحفظ')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكاتب؟ سيتم فك ارتباط مقالاته به.')) return

    try {
      const { error } = await supabase
        .from('authors')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchAuthors()
    } catch (error) {
      console.error('Error deleting author:', error)
      alert('حدث خطأ أثناء الحذف')
    }
  }

  const openForm = (author?: Author) => {
    if (author) {
      setEditingAuthor(author)
      setFormData(author)
    } else {
      setEditingAuthor(null)
      setFormData({})
    }
    setIsFormOpen(true)
  }

  const filteredAuthors = authors.filter(author => 
    author.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">إدارة الكتاب</h1>
        <button
          onClick={() => openForm()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          <span>إضافة كاتب</span>
        </button>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border mb-6">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="بحث في الكتاب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {filteredAuthors.map((author) => (
            <div key={author.id} className="bg-muted/30 rounded-lg border border-border p-4 flex gap-4 items-start">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {author.image ? (
                  <img src={author.image} alt={author.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User size={32} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{author.name}</h3>
                <p className="text-sm text-primary mb-1">{author.role || 'كاتب'}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{author.bio}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => openForm(author)}
                  className="p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(author.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {filteredAuthors.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              لا يوجد كتاب مطابقين للبحث
            </div>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsFormOpen(false)}>
          <div className="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
              <h2 className="text-xl font-bold text-foreground">{editingAuthor ? 'تعديل بيانات الكاتب' : 'إضافة كاتب جديد'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">الاسم</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 bg-background border border-input rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">المسمى الوظيفي (اختياري)</label>
                <input
                  type="text"
                  value={formData.role || ''}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="مثال: محرر سياسي، كاتب رأي"
                  className="w-full p-2 bg-background border border-input rounded-md"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <ImageUpload
                  value={formData.image || ''}
                  onChange={(url) => setFormData({ ...formData, image: url })}
                  label="صورة الكاتب"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">نبذة تعريفية (Bio)</label>
                <textarea
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full p-2 bg-background border border-input rounded-md resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-input rounded-md hover:bg-muted transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
