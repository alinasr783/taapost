import { useState, useEffect } from 'react'
import { supabase, type HomepageSection, type Category } from '../../lib/supabase'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '../components/SortableItem'
import { Plus, Save, Trash2, Eye, EyeOff, Settings } from 'lucide-react'

export default function DashboardHomeCustomization() {
  const [sections, setSections] = useState<HomepageSection[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState<{
    type: 'carousel' | 'category_grid' | 'category_list' | 'custom' | 'latest_grid';
    title: string;
    category_id: number | '';
    count: number;
    source_type: 'latest' | 'category' | 'categories';
    source_ids: number[];
  }>({
    type: 'category_grid',
    title: '',
    category_id: '',
    count: 4,
    source_type: 'latest',
    source_ids: []
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
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [sectionsRes, categoriesRes] = await Promise.all([
        supabase.from('homepage_sections').select('*').order('display_order', { ascending: true }),
        supabase.from('categories').select('*').order('name')
      ])
      
      if (sectionsRes.data) setSections(sectionsRes.data)
      if (categoriesRes.data) setCategories(categoriesRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        // Save new order
        saveOrder(newItems)
        return newItems
      })
    }
  }

  const saveOrder = async (items: HomepageSection[]) => {
    try {
      setIsSaving(true)
      const updates = items.map((item, index) => ({
        id: item.id,
        display_order: index
      }))
      
      await Promise.all(updates.map(u => 
        supabase.from('homepage_sections').update({ display_order: u.display_order }).eq('id', u.id)
      ))
    } catch (err) {
      console.error('Error saving order:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('homepage_sections')
        .update({ is_active: !currentStatus })
        .eq('id', id)
      
      if (error) throw error
      
      setSections(sections.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s))
    } catch (error) {
      console.error('Error toggling status:', error)
      alert('حدث خطأ أثناء تغيير الحالة')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا القسم من الصفحة الرئيسية؟')) return
    
    try {
      const { error } = await supabase
        .from('homepage_sections')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setSections(sections.filter(s => s.id !== id))
    } catch (error) {
      console.error('Error deleting section:', error)
      alert('حدث خطأ أثناء الحذف')
    }
  }

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      let settings: any = { count: formData.count }
      let categoryId = formData.category_id || null

      if (formData.type === 'carousel') {
        settings.source_type = formData.source_type
        
        if (formData.source_type === 'categories') {
          settings.source_ids = formData.source_ids
          categoryId = null
        } else if (formData.source_type === 'category' && formData.category_id) {
            // categoryId is already set from formData
        } else {
            // latest
            categoryId = null
        }
      }

      const newSection = {
        type: formData.type,
        title: formData.title || (categoryId ? categories.find(c => c.id === categoryId)?.name : 'قسم جديد'),
        category_id: categoryId,
        display_order: sections.length + 1,
        is_active: true,
        settings: settings
      }

      const { data, error } = await supabase
        .from('homepage_sections')
        .insert([newSection])
        .select()
      
      if (error) throw error
      
      if (data) {
        setSections([...sections, data[0]])
        setIsFormOpen(false)
        setFormData({
          type: 'category_grid',
          title: '',
          category_id: '',
          count: 4,
          source_type: 'latest',
          source_ids: []
        })
      }
    } catch (error) {
      console.error('Error adding section:', error)
      alert('حدث خطأ أثناء الإضافة')
    } finally {
      setIsSaving(false)
    }
  }

  const getSectionLabel = (section: HomepageSection) => {
    const typeLabels: Record<string, string> = {
      'carousel': 'شريط متحرك (Carousel)',
      'category_grid': 'شبكة مقالات (Grid)',
      'category_list': 'قائمة مقالات (List)',
      'latest_grid': 'آخر المقالات'
    }
    
    let label = typeLabels[section.type] || section.type
    if (section.category_id) {
      const cat = categories.find(c => c.id === section.category_id)
      if (cat) label += ` - ${cat.name}`
    }
    return label
  }

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">تخصيص الصفحة الرئيسية</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          <span>إضافة قسم</span>
        </button>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          قم بسحب الأقسام لإعادة ترتيب ظهورها في الصفحة الرئيسية.
        </p>

        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={sections.map(s => s.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {sections.map((section) => (
                <SortableItem key={section.id} id={section.id} className="bg-muted/30 border border-border">
                  <div className="flex items-center justify-between w-full p-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{section.title}</span>
                      <span className="text-xs text-muted-foreground">{getSectionLabel(section)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent drag start when clicking button
                          handleToggleActive(section.id, section.is_active);
                        }}
                        className={`p-2 rounded transition-colors z-10 relative ${section.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={section.is_active ? 'إخفاء' : 'إظهار'}
                      >
                        {section.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent drag start when clicking button
                          handleDelete(section.id);
                        }}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors z-10 relative"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Add Section Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsFormOpen(false)}>
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border">
              <h2 className="text-xl font-bold">إضافة قسم جديد</h2>
            </div>
            <form onSubmit={handleAddSection} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">نوع القسم</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full p-2 bg-background border border-input rounded-md"
                >
                  <option value="category_grid">شبكة مقالات من قسم (Grid)</option>
                  <option value="category_list">قائمة مقالات من قسم (List)</option>
                  <option value="carousel">شريط متحرك (Carousel)</option>
                  <option value="latest_grid">شبكة آخر المقالات</option>
                </select>
              </div>

              {formData.type === 'carousel' && (
                <div className="space-y-4 border p-4 rounded-md bg-muted/20">
                  <label className="block text-sm font-medium mb-1">مصدر المحتوى</label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="source_type"
                        value="latest"
                        checked={formData.source_type === 'latest'}
                        onChange={(e) => setFormData({ ...formData, source_type: 'latest' as any })}
                      />
                      <span>آخر المقالات (Latest)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="source_type"
                        value="category"
                        checked={formData.source_type === 'category'}
                        onChange={(e) => setFormData({ ...formData, source_type: 'category' as any })}
                      />
                      <span>قسم محدد (Single Category)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="source_type"
                        value="categories"
                        checked={formData.source_type === 'categories'}
                        onChange={(e) => setFormData({ ...formData, source_type: 'categories' as any })}
                      />
                      <span>أقسام متعددة (Multiple Categories)</span>
                    </label>
                  </div>

                  {formData.source_type === 'category' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">اختر القسم</label>
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                        className="w-full p-2 bg-background border border-input rounded-md"
                        required
                      >
                        <option value="">اختر القسم...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.source_type === 'categories' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">اختر الأقسام</label>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-background space-y-2">
                        {categories.map(cat => (
                          <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={formData.source_ids.includes(cat.id)}
                              onChange={(e) => {
                                const newIds = e.target.checked
                                  ? [...formData.source_ids, cat.id]
                                  : formData.source_ids.filter(id => id !== cat.id)
                                setFormData({ ...formData, source_ids: newIds })
                              }}
                            />
                            <span>{cat.name}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">سيتم عرض مقالات من هذه الأقسام مختلطة</p>
                    </div>
                  )}
                </div>
              )}

              {(formData.type === 'category_grid' || formData.type === 'category_list') && (
                <div>
                  <label className="block text-sm font-medium mb-1">القسم</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                    className="w-full p-2 bg-background border border-input rounded-md"
                    required
                  >
                    <option value="">اختر القسم...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">العنوان (اختياري)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={formData.category_id ? categories.find(c => c.id === formData.category_id)?.name : ''}
                  className="w-full p-2 bg-background border border-input rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">عدد المقالات</label>
                <input
                  type="number"
                  value={formData.count}
                  onChange={(e) => setFormData({ ...formData, count: Number(e.target.value) })}
                  min={1}
                  max={20}
                  className="w-full p-2 bg-background border border-input rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-md"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  {isSaving ? 'جاري الحفظ...' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
