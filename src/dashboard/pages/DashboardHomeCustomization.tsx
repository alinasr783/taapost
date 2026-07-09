import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, type HomepageSection, type Category, type HomepageSlider, type SliderPost, type BreakingNewsHero, type Article } from '../../lib/supabase'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '../components/SortableItem'
import SliderPostManager from '../components/SliderPostManager'
import BreakingNewsForm from '../components/BreakingNewsForm'
import { Plus, Trash2, Eye, EyeOff, AlertTriangle, Image, Settings, ChevronDown, ChevronUp, Layers } from 'lucide-react'
import Switch from '../components/Switch'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'

export default function DashboardHomeCustomization() {
  type SectionType = 'carousel' | 'category_grid' | 'category_list' | 'custom' | 'latest_grid' | 'author_focus'
  type SourceType = 'latest' | 'category' | 'categories'

  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // Existing sections
  const [sections, setSections] = useState<HomepageSection[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<HomepageSection | null>(null)

  // Sliders state
  const [sliders, setSliders] = useState<HomepageSlider[]>([])
  const [isSliderFormOpen, setIsSliderFormOpen] = useState(false)
  const [editingSlider, setEditingSlider] = useState<HomepageSlider | null>(null)
  const [deleteSliderTarget, setDeleteSliderTarget] = useState<HomepageSlider | null>(null)
  const [expandedSlider, setExpandedSlider] = useState<number | null>(null)

  // Breaking news state
  const [breakingNews, setBreakingNews] = useState<BreakingNewsHero[]>([])
  const [isBreakingNewsFormOpen, setIsBreakingNewsFormOpen] = useState(false)
  const [editingBreakingNews, setEditingBreakingNews] = useState<BreakingNewsHero | null>(null)
  const [deleteBreakingNewsTarget, setDeleteBreakingNewsTarget] = useState<BreakingNewsHero | null>(null)

  // Slider form state
  const [sliderForm, setSliderForm] = useState({
    name: '',
    category_id: '' as number | '',
    post_count: 5,
    hide_title: false,
  })

  // Form State for existing sections
  const [formData, setFormData] = useState<{
    type: SectionType;
    title: string;
    category_id: number | '';
    count: number;
    source_type: SourceType;
    source_ids: number[];
    content_type: string;
  }>({
    type: 'category_grid',
    title: '',
    category_id: '',
    count: 4,
    source_type: 'latest',
    source_ids: [],
    content_type: 'all'
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [sectionsRes, categoriesRes, slidersRes, breakingRes] = await Promise.all([
        supabase.from('homepage_sections').select('*').order('display_order', { ascending: true }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('homepage_sliders').select('*, categories(id, name), slider_posts(*, articles(id, slug, title, image, date, category_id, type, is_exclusive))').order('display_order', { ascending: true }),
        supabase.from('breaking_news_hero').select('*, articles(id, slug, title, image, date, category_id, type, is_exclusive, categories(id, name))').order('display_order', { ascending: true }),
      ])

      if (sectionsRes.data) setSections(sectionsRes.data)
      if (categoriesRes.data) setCategories(categoriesRes.data)
      if (slidersRes.data) {
        const slidersWithSections = slidersRes.data.map(s => {
          const linkedSection = sectionsRes.data?.find(sec => sec.type === 'managed_slider' && sec.settings?.slider_id === s.id)
          return {
            ...s,
            hide_title: s.hide_title ?? false,
            slider_posts: (s.slider_posts || []).sort((a: SliderPost, b: SliderPost) => a.sort_order - b.sort_order),
            section_id: linkedSection?.id,
          }
        })
        setSliders(slidersWithSections)
      }
      if (breakingRes.data) setBreakingNews(breakingRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // ============ EXISTING SECTIONS HANDLERS ============

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id === over?.id) return
    const oldIndex = sections.findIndex((item) => item.id === active.id)
    const newIndex = sections.findIndex((item) => item.id === over?.id)
    const newItems = arrayMove([...sections], oldIndex, newIndex)
    setSections(newItems)
    saveOrder(newItems)
  }

  const saveOrder = async (items: HomepageSection[]) => {
    const prevSections = [...sections]
    try {
      setIsSaving(true)
      for (let i = 0; i < items.length; i++) {
        const { error } = await supabase
          .from('homepage_sections')
          .update({ display_order: i })
          .eq('id', items[i].id)
        if (error) throw error
      }
      queryClient.invalidateQueries({ queryKey: ['home_data'] })
      showToast('تم حفظ الترتيب بنجاح')
    } catch (err) {
      console.error('Error saving order:', err)
      setSections(prevSections)
      showToast('حدث خطأ أثناء حفظ الترتيب، تم التراجع', 'error')
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
      queryClient.invalidateQueries({ queryKey: ['home_data'] })
      showToast(!currentStatus ? 'تم تفعيل القسم' : 'تم إخفاء القسم')
    } catch (error) {
      console.error('Error toggling status:', error)
      showToast('حدث خطأ أثناء تغيير الحالة', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const { error } = await supabase
        .from('homepage_sections')
        .delete()
        .eq('id', deleteTarget.id)
      if (error) throw error
      setSections(sections.filter(s => s.id !== deleteTarget.id))
      queryClient.invalidateQueries({ queryKey: ['home_data'] })
      showToast('تم حذف القسم بنجاح')
      setDeleteTarget(null)
    } catch (error) {
      console.error('Error deleting section:', error)
      showToast('حدث خطأ أثناء الحذف', 'error')
    }
  }

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const settings: Record<string, unknown> = { count: formData.count, content_type: formData.content_type }
      let categoryId = formData.category_id || null

      if (formData.type === 'carousel') {
        settings.source_type = formData.source_type
        if (formData.source_type === 'categories') {
          settings.source_ids = formData.source_ids
          categoryId = null
        }
      }

      const newSection = {
        type: formData.type,
        title: formData.title || (categoryId ? categories.find(c => c.id === categoryId)?.name : 'قسم جديد'),
        category_id: categoryId,
        display_order: sections.length,
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
        queryClient.invalidateQueries({ queryKey: ['home_data'] })
        setFormData({ type: 'category_grid', title: '', category_id: '', count: 4, source_type: 'latest', source_ids: [], content_type: 'all' })
        showToast('تم إضافة القسم بنجاح')
      }
    } catch (error) {
      console.error('Error adding section:', error)
      showToast('حدث خطأ أثناء الإضافة', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const getSectionLabel = (section: HomepageSection) => {
    const typeLabels: Record<string, string> = {
      'carousel': 'شريط متحرك (Carousel)',
      'category_grid': 'شبكة مقالات (Grid)',
      'category_list': 'قائمة مقالات (List)',
      'latest_grid': 'آخر المقالات',
      'author_focus': 'بطاقات الكتّاب (Author Focus)',
      'managed_slider': 'سلايدر مخصص',
    }
    let label = typeLabels[section.type] || section.type
    if (section.type === 'managed_slider') {
      const slider = sliders.find(s => s.id === section.settings?.slider_id)
      if (slider) label += ` - ${slider.name}`
    } else if (section.category_id) {
      const cat = categories.find(c => c.id === section.category_id)
      if (cat) label += ` - ${cat.name}`
    }
    return label
  }

  // ============ SLIDER HANDLERS ============

  const handleToggleHideTitle = async (slider: HomepageSlider) => {
    try {
      const newHideTitle = !slider.hide_title
      const { error } = await supabase
        .from('homepage_sliders')
        .update({ hide_title: newHideTitle })
        .eq('id', slider.id)
      if (error) throw error
      // Also update the linked section settings
      if (slider.section_id) {
        await supabase.from('homepage_sections').update({ settings: { slider_id: slider.id, hide_title: newHideTitle } }).eq('id', slider.section_id)
      }
      setSliders(sliders.map(s => s.id === slider.id ? { ...s, hide_title: newHideTitle } : s))
      queryClient.invalidateQueries({ queryKey: ['home_data'] })
      showToast(newHideTitle ? 'تم إخفاء العنوان' : 'تم إظهار العنوان')
    } catch (error) {
      showToast('حدث خطأ', 'error')
    }
  }

  const handleToggleSliderActive = async (slider: HomepageSlider) => {
    try {
      const newActive = !slider.is_active
      const { error } = await supabase
        .from('homepage_sliders')
        .update({ is_active: newActive })
        .eq('id', slider.id)
      if (error) throw error
      // Also toggle the linked section
      if (slider.section_id) {
        await supabase.from('homepage_sections').update({ is_active: newActive }).eq('id', slider.section_id)
        setSections(sections.map(s => s.id === slider.section_id ? { ...s, is_active: newActive } : s))
      }
      setSliders(sliders.map(s => s.id === slider.id ? { ...s, is_active: newActive } : s))
      queryClient.invalidateQueries({ queryKey: ['home_data'] })
      showToast(newActive ? 'تم تفعيل السلايدر' : 'تم تعطيل السلايدر')
    } catch (error) {
      showToast('حدث خطأ', 'error')
    }
  }

  const handleDeleteSlider = async () => {
    if (!deleteSliderTarget) return
    try {
      const { error } = await supabase
        .from('homepage_sliders')
        .delete()
        .eq('id', deleteSliderTarget.id)
      if (error) throw error
      // Also delete the linked homepage section
      if (deleteSliderTarget.section_id) {
        await supabase.from('homepage_sections').delete().eq('id', deleteSliderTarget.section_id)
        setSections(sections.filter(s => s.id !== deleteSliderTarget.section_id))
      }
      setSliders(sliders.filter(s => s.id !== deleteSliderTarget.id))
      queryClient.invalidateQueries({ queryKey: ['home_data'] })
      showToast('تم حذف السلايدر')
      setDeleteSliderTarget(null)
    } catch (error) {
      showToast('حدث خطأ', 'error')
    }
  }

  const handleAddSlider = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sliderForm.name || !sliderForm.category_id) {
      return showToast('يجب إدخال الاسم واختيار القسم', 'error')
    }
    setIsSaving(true)
    try {
      const { data, error } = await supabase
        .from('homepage_sliders')
        .insert([{
          name: sliderForm.name,
          category_id: sliderForm.category_id,
          post_count: sliderForm.post_count,
          hide_title: sliderForm.hide_title,
          display_order: sliders.length,
          is_active: true,
        }])
        .select()
      if (error) throw error
      if (data) {
        const newSlider = data[0]
        // Auto-create a homepage section for this slider
        const sectionTitle = sliderForm.name
        const { data: sectionData, error: sectionError } = await supabase
          .from('homepage_sections')
          .insert([{
            type: 'managed_slider',
            title: sectionTitle,
            display_order: sections.length,
            is_active: true,
            settings: { slider_id: newSlider.id, hide_title: sliderForm.hide_title },
          }])
          .select()
        if (sectionError) console.error('Error creating section:', sectionError)

        const sectionId = sectionData?.[0]?.id
        setSliders([...sliders, {
          ...newSlider,
          hide_title: sliderForm.hide_title,
          slider_posts: [],
          categories: categories.find(c => c.id === sliderForm.category_id),
          section_id: sectionId,
        }])
        if (sectionData) {
          setSections([...sections, sectionData[0]])
        }
        setIsSliderFormOpen(false)
        setSliderForm({ name: '', category_id: '', post_count: 5, hide_title: false })
        queryClient.invalidateQueries({ queryKey: ['home_data'] })
        showToast('تم إضافة السلايدر')
      }
    } catch (error) {
      showToast('حدث خطأ', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateSliderPosts = async (sliderId: number, posts: Article[]) => {
    try {
      // Delete existing
      await supabase.from('slider_posts').delete().eq('slider_id', sliderId)
      // Insert new
      if (posts.length > 0) {
        const { error } = await supabase
          .from('slider_posts')
          .insert(posts.map((p, i) => ({ slider_id: sliderId, article_id: p.id, sort_order: i })))
        if (error) throw error
      }
      // Update local state
      setSliders(sliders.map(s => {
        if (s.id !== sliderId) return s
        return { ...s, slider_posts: posts.map((p, i) => ({ id: 0, slider_id: sliderId, article_id: p.id, sort_order: i, articles: p })) }
      }))
      queryClient.invalidateQueries({ queryKey: ['home_data'] })
      showToast('تم حفظ المقالات')
    } catch (error) {
      showToast('حدث خطأ أثناء الحفظ', 'error')
    }
  }

  // ============ BREAKING NEWS HANDLERS ============

  const handleToggleBreakingNewsActive = async (item: BreakingNewsHero) => {
    try {
      const { error } = await supabase
        .from('breaking_news_hero')
        .update({ is_active: !item.is_active })
        .eq('id', item.id)
      if (error) throw error
      setBreakingNews(breakingNews.map(b => b.id === item.id ? { ...b, is_active: !b.is_active } : b))
      queryClient.invalidateQueries({ queryKey: ['home_data'] })
      showToast(item.is_active ? 'تم تعطيل الخبر' : 'تم تفعيل الخبر')
    } catch (error) {
      showToast('حدث خطأ', 'error')
    }
  }

  const handleDeleteBreakingNews = async () => {
    if (!deleteBreakingNewsTarget) return
    try {
      const { error } = await supabase
        .from('breaking_news_hero')
        .delete()
        .eq('id', deleteBreakingNewsTarget.id)
      if (error) throw error
      setBreakingNews(breakingNews.filter(b => b.id !== deleteBreakingNewsTarget.id))
      queryClient.invalidateQueries({ queryKey: ['home_data'] })
      showToast('تم حذف الخبر العاجل')
      setDeleteBreakingNewsTarget(null)
    } catch (error) {
      showToast('حدث خطأ', 'error')
    }
  }

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-foreground">تخصيص الصفحة الرئيسية</h1>

      {/* ============ SECTION 1: BREAKING NEWS HERO ============ */}
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-500" />
            <h2 className="text-lg font-bold text-foreground">الأخبار العاجلة</h2>
          </div>
          <button
            onClick={() => { setEditingBreakingNews(null); setIsBreakingNewsFormOpen(true) }}
            className="bg-amber-500 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm hover:bg-amber-600 transition-colors"
          >
            <Plus size={16} />
            <span>إضافة خبر عاجل</span>
          </button>
        </div>
        <div className="p-4">
          {breakingNews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد أخبار عاجلة حالياً</p>
          ) : (
            <div className="space-y-3">
              {breakingNews.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="w-16 h-12 rounded overflow-hidden bg-muted shrink-0">
                    {item.articles?.image ? (
                      <img src={item.articles.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">صورة</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.articles?.title || 'خبر محذوف'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.articles?.categories?.name}</span>
                      <span>•</span>
                      <span>{item.articles?.date ? new Date(item.articles.date).toLocaleDateString('ar-EG') : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleBreakingNewsActive(item)}
                      className={`p-1.5 rounded transition-colors ${item.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                      title={item.is_active ? 'إخفاء' : 'إظهار'}
                    >
                      {item.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={() => { setEditingBreakingNews(item); setIsBreakingNewsFormOpen(true) }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="تعديل"
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteBreakingNewsTarget(item)}
                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Breaking News Form Modal */}
      {isBreakingNewsFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsBreakingNewsFormOpen(false)}>
          <div className="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border">
              <h2 className="text-xl font-bold">
                {editingBreakingNews ? 'تعديل الخبر العاجل' : 'إضافة خبر عاجل'}
              </h2>
            </div>
            <div className="p-6">
              <BreakingNewsForm
                existing={editingBreakingNews}
                categories={categories}
                onSave={() => { setIsBreakingNewsFormOpen(false); setEditingBreakingNews(null); fetchAllData() }}
                onCancel={() => { setIsBreakingNewsFormOpen(false); setEditingBreakingNews(null) }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============ SECTION 2: SLIDERS MANAGEMENT ============ */}
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Image size={20} className="text-blue-500" />
            <h2 className="text-lg font-bold text-foreground">السلايدرات</h2>
          </div>
          <button
            onClick={() => { setEditingSlider(null); setSliderForm({ name: '', category_id: '', post_count: 5 }); setIsSliderFormOpen(true) }}
            className="bg-blue-500 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm hover:bg-blue-600 transition-colors"
          >
            <Plus size={16} />
            <span>إضافة سلايدر</span>
          </button>
        </div>
        <div className="p-4">
          {sliders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد سلايدرات حالياً</p>
          ) : (
            <div className="space-y-4">
              {sliders.map(slider => (
                <div key={slider.id} className="border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{slider.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {slider.categories?.name} • {(slider.slider_posts || []).length} مقالات
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setExpandedSlider(expandedSlider === slider.id ? null : slider.id)}
                        className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors"
                        title="إدارة المقالات"
                      >
                        {expandedSlider === slider.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button
                        onClick={() => handleToggleHideTitle(slider)}
                        className={`p-1.5 rounded transition-colors ${slider.hide_title ? 'text-amber-600 hover:bg-amber-50' : 'text-muted-foreground hover:bg-muted'}`}
                        title={slider.hide_title ? 'إظهار العنوان' : 'إخفاء العنوان'}
                      >
                        <Settings size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleSliderActive(slider)}
                        className={`p-1.5 rounded transition-colors ${slider.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={slider.is_active ? 'إخفاء' : 'إظهار'}
                      >
                        {slider.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        onClick={() => setDeleteSliderTarget(slider)}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {expandedSlider === slider.id && (
                    <div className="p-4 border-t border-border">
                      <SliderPostManager
                        categoryId={slider.category_id}
                        selectedArticles={(slider.slider_posts || []).map(sp => sp.articles).filter(Boolean) as Article[]}
                        onChange={(posts) => handleUpdateSliderPosts(slider.id, posts)}
                        maxCount={slider.post_count}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Slider Modal */}
      {isSliderFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsSliderFormOpen(false)}>
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-border" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border">
              <h2 className="text-xl font-bold">إضافة سلايدر جديد</h2>
            </div>
            <form onSubmit={handleAddSlider} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم السلايدر</label>
                <input
                  type="text"
                  value={sliderForm.name}
                  onChange={e => setSliderForm({ ...sliderForm, name: e.target.value })}
                  placeholder="مثال: أخبار الرياضة"
                  className="w-full p-2 bg-background border border-input rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">القسم</label>
                <select
                  value={sliderForm.category_id}
                  onChange={e => setSliderForm({ ...sliderForm, category_id: Number(e.target.value) || '' })}
                  className="w-full p-2 bg-background border border-input rounded-md"
                  required
                >
                  <option value="">اختر القسم...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">عدد المقالات الأقصى</label>
                <input
                  type="number"
                  value={sliderForm.post_count}
                  onChange={e => setSliderForm({ ...sliderForm, post_count: Number(e.target.value) })}
                  min={1}
                  max={20}
                  className="w-full p-2 bg-background border border-input rounded-md"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hide_title"
                  checked={sliderForm.hide_title}
                  onChange={e => setSliderForm({ ...sliderForm, hide_title: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="hide_title" className="text-sm font-medium">إخفاء العنوان في الصفحة الرئيسية</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsSliderFormOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-md">
                  إلغاء
                </button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50">
                  {isSaving ? 'جاري الحفظ...' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ SECTION 3: EXISTING HOMEPAGE SECTIONS ============ */}
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-purple-500" />
            <h2 className="text-lg font-bold text-foreground">أقسام الصفحة الرئيسية</h2>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            <span>إضافة قسم</span>
          </button>
        </div>
        <div className="p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            قم بسحب الأقسام لإعادة ترتيب ظهورها في الصفحة الرئيسية.
          </p>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
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
                          onClick={(e) => { e.stopPropagation(); handleToggleActive(section.id, section.is_active); }}
                          className={`p-1.5 rounded transition-colors z-10 relative ${section.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          title={section.is_active ? 'إخفاء' : 'إظهار'}
                        >
                          {section.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(section); }}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors z-10 relative"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Add Section Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsFormOpen(false)}>
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-border" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border">
              <h2 className="text-xl font-bold">إضافة قسم جديد</h2>
            </div>
            <form onSubmit={handleAddSection} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">نوع القسم</label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    const next = e.target.value
                    if (['carousel', 'category_grid', 'category_list', 'custom', 'latest_grid', 'author_focus'].includes(next)) {
                      setFormData({ ...formData, type: next as SectionType, content_type: next === 'author_focus' ? 'article' : formData.content_type })
                    }
                  }}
                  className="w-full p-2 bg-background border border-input rounded-md"
                >
                  <option value="category_grid">شبكة مقالات من قسم (Grid)</option>
                  <option value="category_list">قائمة مقالات من قسم (List)</option>
                  <option value="carousel">شريط متحرك (Carousel)</option>
                  <option value="latest_grid">شبكة آخر المقالات</option>
                  <option value="author_focus">بطاقات الكتّاب (Author Focus)</option>
                </select>
              </div>

              {formData.type === 'carousel' && (
                <div className="space-y-4 border p-4 rounded-md bg-muted/20">
                  <label className="block text-sm font-medium mb-1">مصدر المحتوى</label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="source_type" value="latest" checked={formData.source_type === 'latest'} onChange={() => setFormData({ ...formData, source_type: 'latest' })} />
                      <span>آخر المقالات</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="source_type" value="category" checked={formData.source_type === 'category'} onChange={() => setFormData({ ...formData, source_type: 'category' })} />
                      <span>قسم محدد</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="source_type" value="categories" checked={formData.source_type === 'categories'} onChange={() => setFormData({ ...formData, source_type: 'categories' })} />
                      <span>أقسام متعددة</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">نوع المحتوى</label>
                    <select value={formData.content_type} onChange={e => setFormData({ ...formData, content_type: e.target.value })} className="w-full p-2 bg-background border border-input rounded-md">
                      <option value="all">الكل</option>
                      <option value="article">مقالات فقط</option>
                      <option value="other">محتوى آخر فقط</option>
                    </select>
                  </div>

                  {formData.source_type === 'category' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">اختر القسم</label>
                      <select value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: Number(e.target.value) })} className="w-full p-2 bg-background border border-input rounded-md" required>
                        <option value="">اختر القسم...</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                  )}

                  {formData.source_type === 'categories' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">اختر الأقسام</label>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-background space-y-2">
                        {categories.map(cat => (
                          <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                            <Switch
                              checked={formData.source_ids.includes(cat.id)}
                              onCheckedChange={(checked) => {
                                const newIds = checked ? [...formData.source_ids, cat.id] : formData.source_ids.filter(id => id !== cat.id)
                                setFormData({ ...formData, source_ids: newIds })
                              }}
                            />
                            <span>{cat.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(formData.type === 'category_grid' || formData.type === 'category_list') && (
                <div>
                  <label className="block text-sm font-medium mb-1">القسم</label>
                  <select value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: Number(e.target.value) })} className="w-full p-2 bg-background border border-input rounded-md" required>
                    <option value="">اختر القسم...</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">العنوان (اختياري)</label>
                <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder={formData.category_id ? categories.find(c => c.id === formData.category_id)?.name : ''} className="w-full p-2 bg-background border border-input rounded-md" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">عدد المقالات</label>
                <input type="number" value={formData.count} onChange={e => setFormData({ ...formData, count: Number(e.target.value) })} min={1} max={20} className="w-full p-2 bg-background border border-input rounded-md" />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-md">إلغاء</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                  {isSaving ? 'جاري الحفظ...' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="حذف القسم"
        message={`هل أنت متأكد من حذف "${deleteTarget?.title}" من الصفحة الرئيسية؟`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteSliderTarget}
        title="حذف السلايدر"
        message={`هل أنت متأكد من حذف "${deleteSliderTarget?.name}"؟ جميع المقالات المرتبطة به будут حذف.`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDeleteSlider}
        onCancel={() => setDeleteSliderTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteBreakingNewsTarget}
        title="حذف الخبر العاجل"
        message="هل أنت متأكد من حذف هذا الخبر العاجل؟"
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDeleteBreakingNews}
        onCancel={() => setDeleteBreakingNewsTarget(null)}
      />
    </div>
  )
}
