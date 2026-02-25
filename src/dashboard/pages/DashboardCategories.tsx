import { useState, useEffect } from 'react'
import { supabase, type Category } from '../../lib/supabase'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '../components/SortableItem'
import ImageUpload from '../components/ImageUpload'

export default function DashboardCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'list' | 'header_order' | 'home_order'>('list')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    topics: ''
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('order_index', { ascending: true }) // Default sort by header order
    
    if (data) setCategories(data)
    setLoading(false)
  }

  const handleDragEndHeader = async (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        // Save new order
        saveOrder(newItems, 'order_index')
        return newItems
      })
    }
  }

  const handleDragEndHome = async (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      // For home order, we might want to sort the local state by display_order first?
      // Or just reorder the current list? 
      // The current list is sorted by order_index (header).
      // When switching tabs, we should probably resort the list based on the active tab's criteria.
      // But arrayMove works on indices.
      // So, when tab changes, I should sort the categories array based on that tab's order field.
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        saveOrder(newItems, 'display_order')
        return newItems
      })
    }
  }

  const saveOrder = async (items: Category[], field: 'order_index' | 'display_order') => {
    try {
      setIsSaving(true)
      const updates = items.map((item, index) => ({
        id: item.id,
        [field]: index
      }))
      
      await Promise.all(updates.map(u => 
        supabase.from('categories').update({ [field]: u[field] }).eq('id', u.id)
      ))
      
      // Notify success (optional)
    } catch (err) {
      console.error('Error saving order:', err)
      alert('حدث خطأ أثناء حفظ الترتيب')
    } finally {
      setIsSaving(false)
    }
  }

  // Effect to resort when tab changes
  useEffect(() => {
    if (activeTab === 'header_order') {
      setCategories(prev => [...prev].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)))
    } else if (activeTab === 'home_order') {
      setCategories(prev => [...prev].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)))
    } else {
      // Default list view - maybe sort by ID or name?
      setCategories(prev => [...prev].sort((a, b) => a.id - b.id))
    }
  }, [activeTab])

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع المقالات المرتبطة به!')) return
    
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      alert('حدث خطأ أثناء الحذف')
    } else {
      setCategories(categories.filter(c => c.id !== id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const dataToSave = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        image: formData.image,
        topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean)
      }

      if (editingCategory) {
        await supabase.from('categories').update(dataToSave).eq('id', editingCategory.id)
      } else {
        await supabase.from('categories').insert([dataToSave])
      }
      
      setIsFormOpen(false)
      fetchCategories()
    } catch (err) {
      console.error(err)
      alert('حدث خطأ أثناء الحفظ')
    } finally {
      setIsSaving(false)
    }
  }

  const openForm = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        image: category.image || '',
        topics: category.topics ? category.topics.join(', ') : ''
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
        slug: '',
        description: '',
        image: '',
        topics: ''
      })
    }
    setIsFormOpen(true)
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">إدارة الأقسام</h1>
        <button
          onClick={() => openForm()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          <span>إضافة قسم</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'list' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}
        >
          قائمة الأقسام
        </button>
        <button
          onClick={() => setActiveTab('header_order')}
          className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'header_order' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}
        >
          ترتيب القائمة (يمين لليسار)
        </button>
        <button
          onClick={() => setActiveTab('home_order')}
          className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'home_order' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}
        >
          ترتيب الرئيسية (أعلى لأسفل)
        </button>
      </div>

      {/* Content */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        {activeTab === 'list' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-muted/50 text-muted-foreground font-medium">
                <tr>
                  <th className="p-4">الاسم</th>
                  <th className="p-4">الوصف</th>
                  <th className="p-4">عدد المواضيع</th>
                  <th className="p-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{category.name}</td>
                    <td className="p-4 text-muted-foreground max-w-xs truncate">{category.description}</td>
                    <td className="p-4 text-muted-foreground">{category.topics?.length || 0}</td>
                    <td className="p-4 flex gap-2">
                      <button
                        onClick={() => openForm(category)}
                        className="p-2 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'header_order' && (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              اسحب الأقسام لترتيبها كما ستظهر في القائمة العلوية (من اليمين إلى اليسار).
            </p>
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEndHeader}
            >
              <SortableContext 
                items={categories.map(c => c.id)} 
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded border border-border">
                  {categories.map((category) => (
                    <SortableItem key={category.id} id={category.id} name={category.name} className="bg-card shadow-sm border border-border" />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {activeTab === 'home_order' && (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              اسحب الأقسام لترتيبها كما ستظهر في الصفحة الرئيسية (من الأعلى إلى الأسفل).
            </p>
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEndHome}
            >
              <SortableContext 
                items={categories.map(c => c.id)} 
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2 max-w-md mx-auto">
                  {categories.map((category) => (
                    <SortableItem key={category.id} id={category.id} name={category.name} className="w-full bg-card shadow-sm border border-border" />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-lg border border-border">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">{editingCategory ? 'تعديل قسم' : 'إضافة قسم جديد'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">اسم القسم</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                      const name = e.target.value;
                      setFormData(prev => ({
                          ...prev,
                          name,
                          slug: editingCategory ? prev.slug : name.trim().replace(/\s+/g, '-')
                      }))
                  }}
                  className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">الرابط (Slug)</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full p-2 bg-muted/50 border border-input rounded-md focus:ring-2 focus:ring-ring outline-none"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">المواضيع (مفصولة بفاصلة)</label>
                <input
                  type="text"
                  value={formData.topics}
                  onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                  className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none"
                  placeholder="سياسة, اقتصاد, رياضة"
                />
              </div>
              <div>
                <ImageUpload
                  value={formData.image}
                  onChange={(url) => setFormData({ ...formData, image: url })}
                  label="صورة القسم"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                  disabled={isSaving}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2 transition-colors"
                  disabled={isSaving}
                >
                  <Save size={18} />
                  <span>{isSaving ? 'جاري الحفظ...' : 'حفظ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
