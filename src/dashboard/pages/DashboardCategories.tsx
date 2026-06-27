import { useState, useEffect } from 'react'
import { supabase, type Category } from '../../lib/supabase'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '../components/SortableItem'
import ImageUpload from '../components/ImageUpload'
import IconPicker from '../../components/IconPicker'
import DynamicIcon from '../../components/DynamicIcon'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'

export default function DashboardCategories() {
  const { showToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'list' | 'header_order' | 'home_order' | 'sidebar_order'>('list')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [orderSnapshot, setOrderSnapshot] = useState<Category[]>([])
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    topics: '',
    icon: '',
    order_index: 0,
    display_order: 0
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
      .order('order_index', { ascending: true })
    
    if (data) {
      setCategories(data)
      setOrderSnapshot([...data])
    }
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
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        saveOrder(newItems, 'display_order')
        return newItems
      })
    }
  }

  const handleDragEndSidebar = async (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        saveOrder(newItems, 'sidebar_order')
        return newItems
      })
    }
  }

  const saveOrder = async (items: Category[], field: 'order_index' | 'display_order' | 'sidebar_order') => {
    try {
      setIsSaving(true)
      const updates = items.map((item, index) => ({
        id: item.id,
        [field]: index
      }))
      
      await Promise.all(updates.map(u => 
        supabase.from('categories').update({ [field]: u[field] }).eq('id', u.id)
      ))

      setOrderSnapshot([...items])
      showToast('تم حفظ الترتيب بنجاح', 'success')
    } catch (err) {
      console.error('Error saving order:', err)
      showToast('حدث خطأ أثناء حفظ الترتيب', 'error')
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
    } else if (activeTab === 'sidebar_order') {
      setCategories(prev => [...prev].sort((a, b) => (a.sidebar_order || 0) - (b.sidebar_order || 0)))
    } else {
      setCategories(prev => [...prev].sort((a, b) => a.id - b.id))
    }
  }, [activeTab])

  const openDeleteConfirm = (id: number) => {
    setDeleteTarget(id)
    setConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (deleteTarget === null) return
    
    const { error } = await supabase.from('categories').delete().eq('id', deleteTarget)
    if (error) {
      showToast('حدث خطأ أثناء الحذف', 'error')
    } else {
      setCategories(categories.filter(c => c.id !== deleteTarget))
      showToast('تم حذف القسم بنجاح', 'success')
    }
    setConfirmOpen(false)
    setDeleteTarget(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const dataToSave: Record<string, unknown> = {
        name: formData.name,
        description: formData.description,
        image: formData.image,
        topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
        icon: formData.icon || null,
        order_index: formData.order_index,
        display_order: formData.display_order
      }

      if (editingCategory) {
        const { error } = await supabase.from('categories').update(dataToSave).eq('id', editingCategory.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('categories').insert([dataToSave])
        if (error) {
          if (typeof error.message === 'string' && error.message.toLowerCase().includes('slug')) {
            const slug = `c_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
            const retry = await supabase.from('categories').insert([{ ...dataToSave, slug }])
            if (retry.error) throw retry.error
          } else {
            throw error
          }
        }
      }
      
      setIsFormOpen(false)
      showToast(editingCategory ? 'تم تعديل القسم بنجاح' : 'تم إنشاء القسم بنجاح', 'success')
      fetchCategories()
    } catch (err) {
      console.error(err)
      showToast('حدث خطأ أثناء الحفظ', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const openForm = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        description: category.description || '',
        image: category.image || '',
        topics: category.topics ? category.topics.join(', ') : '',
        icon: category.icon || '',
        order_index: category.order_index || 0,
        display_order: category.display_order || 0
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
        description: '',
        image: '',
        topics: '',
        icon: '',
        order_index: 0,
        display_order: 0
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
        <button
          onClick={() => setActiveTab('sidebar_order')}
          className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'sidebar_order' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}
        >
          ترتيب القائمة الجانبية
        </button>
      </div>

      {/* Content */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        {activeTab === 'list' && (
          <>
            <div className="md:hidden space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">{category.name}</div>
                      {category.description && (
                        <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{category.description}</div>
                      )}
                      <div className="mt-2 text-xs text-muted-foreground">
                        عدد المواضيع: {category.topics?.length || 0}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => openForm(category)}
                        className="p-2 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="تعديل"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(category.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
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
                          title="تعديل"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(category.id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'header_order' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                اسحب الأقسام لترتيبها كما ستظهر في القائمة العلوية (من اليمين إلى اليسار).
              </p>
              <button
                onClick={() => saveOrder(categories, 'order_index')}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save size={16} />
                <span>{isSaving ? 'جاري الحفظ...' : 'حفظ الترتيب'}</span>
              </button>
            </div>
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
                    <SortableItem key={category.id} id={category.id} className="bg-card shadow-sm border border-border">
                      {category.name}
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {activeTab === 'home_order' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                اسحب الأقسام لترتيبها كما ستظهر في الصفحة الرئيسية (من الأعلى إلى الأسفل).
              </p>
              <button
                onClick={() => saveOrder(categories, 'display_order')}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save size={16} />
                <span>{isSaving ? 'جاري الحفظ...' : 'حفظ الترتيب'}</span>
              </button>
            </div>
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
                    <SortableItem key={category.id} id={category.id} className="w-full bg-card shadow-sm border border-border">
                      {category.name}
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {activeTab === 'sidebar_order' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                اسحب الأقسام لترتيبها كما ستظهر في القائمة الجانبية للمستخدم العادي (من الأعلى إلى الأسفل).
              </p>
              <button
                onClick={() => saveOrder(categories, 'sidebar_order')}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save size={16} />
                <span>{isSaving ? 'جاري الحفظ...' : 'حفظ الترتيب'}</span>
              </button>
            </div>
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEndSidebar}
            >
              <SortableContext 
                items={categories.map(c => c.id)} 
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2 max-w-md mx-auto">
                  {categories.map((category) => (
                    <SortableItem key={category.id} id={category.id} className="w-full bg-card shadow-sm border border-border">
                      {category.name}
                    </SortableItem>
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
                      const name = e.target.value
                      setFormData(prev => ({
                          ...prev,
                          name,
                      }))
                  }}
                  className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">ترتيب القائمة</label>
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">ترتيب الرئيسية</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none"
                  />
                </div>
              </div>
              <div>
                <ImageUpload
                  value={formData.image}
                  onChange={(url) => setFormData({ ...formData, image: url })}
                  label="صورة القسم"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  الأيقونة
                  {formData.icon && (
                    <span className="inline-flex items-center gap-1 mr-2 text-xs text-muted-foreground">
                      <DynamicIcon name={formData.icon} size={14} />
                      <span className="font-mono">{formData.icon}</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: '' })}
                        className="text-destructive hover:underline"
                      >
                        إزالة
                      </button>
                    </span>
                  )}
                </label>
                <IconPicker
                  value={formData.icon}
                  onChange={(iconName) => setFormData({ ...formData, icon: iconName })}
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

      <ConfirmDialog
        isOpen={confirmOpen}
        title="حذف القسم"
        message="هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع المقالات المرتبطة به!"
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteTarget(null) }}
      />
    </div>
  )
}
