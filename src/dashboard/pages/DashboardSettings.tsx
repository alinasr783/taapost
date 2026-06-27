import { useEffect, useState } from 'react'
import { Save, Plus, Trash2, GripVertical, X, Facebook, Twitter, Instagram, Linkedin, Youtube, MessageCircle, Send, Mail, Globe, Link as LinkIcon, Loader2, Settings, Image, Search, Share2 } from 'lucide-react'
import { supabase, type SocialLink, type ShareMessage } from '../../lib/supabase'
import Switch from '../components/Switch'
import LogoController from '../components/LogoController'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import InfoTooltip from '../components/InfoTooltip'

const AVAILABLE_ICONS = [
  { name: 'Facebook', icon: Facebook },
  { name: 'Twitter', icon: Twitter },
  { name: 'Instagram', icon: Instagram },
  { name: 'Linkedin', icon: Linkedin },
  { name: 'Youtube', icon: Youtube },
  { name: 'Whatsapp', icon: MessageCircle },
  { name: 'Telegram', icon: Send },
  { name: 'Mail', icon: Mail },
  { name: 'Globe', icon: Globe },
  { name: 'Link', icon: LinkIcon }
]

type SiteSettings = {
  id: number
  site_name: string
  site_description: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  show_article_summary: boolean
  meta_title: string | null
  meta_description: string | null
  og_title: string | null
  og_description: string | null
  og_image: string | null
  twitter_handle: string | null
  keywords: string | null
}

type TabKey = 'general' | 'logo' | 'social' | 'seo' | 'share'

const TABS: { key: TabKey; label: string; icon: typeof Settings }[] = [
  { key: 'general', label: 'إعدادات الموقع', icon: Settings },
  { key: 'logo', label: 'التحكم باللوجو', icon: Image },
  { key: 'seo', label: 'SEO', icon: Search },
  { key: 'social', label: 'التواصل الاجتماعي', icon: Globe },
  { key: 'share', label: 'رسائل المشاركة', icon: Share2 },
]

const SHARE_PLATFORMS = [
  { key: 'facebook', label: 'فيسبوك', icon: Facebook },
  { key: 'twitter', label: 'تويتر / X', icon: Twitter },
  { key: 'whatsapp', label: 'واتساب', icon: MessageCircle },
  { key: 'telegram', label: 'تيليجرام', icon: Send },
  { key: 'linkedin', label: 'لينكد إن', icon: Linkedin },
  { key: 'reddit', label: 'ريديت', icon: Globe },
]

export default function DashboardSettings() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>('general')
  const [links, setLinks] = useState<SocialLink[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newLink, setNewLink] = useState<Partial<SocialLink> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SocialLink | null>(null)
  
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    id: 1,
    site_name: '',
    site_description: '',
    logo_url: null,
    primary_color: '#8B4513',
    secondary_color: '#000000',
    show_article_summary: true,
    meta_title: null,
    meta_description: null,
    og_title: null,
    og_description: null,
    og_image: null,
    twitter_handle: null,
    keywords: null,
  })
  const [savingSettings, setSavingSettings] = useState(false)

  // Share Messages State
  const [shareMessages, setShareMessages] = useState<ShareMessage[]>([])
  const [editingShareId, setEditingShareId] = useState<number | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true)
        await Promise.all([fetchLinks(), fetchSiteSettings(), fetchShareMessages()])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function fetchSiteSettings() {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .single()
    
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error fetching site settings:', error)
      }
    } else if (data) {
      setSiteSettings({
        ...data,
        show_article_summary: (data as Record<string, unknown>).show_article_summary !== false,
      })
    }
  }

  async function fetchLinks() {
    const { data, error } = await supabase
      .from('social_links')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error
    if (data) setLinks(data)
  }

  async function fetchShareMessages() {
    const { data, error } = await supabase
      .from('share_messages')
      .select('*')
      .order('platform', { ascending: true })

    if (error) throw error
    if (data) setShareMessages(data)
  }

  async function handleSaveSettings() {
    try {
      setSavingSettings(true)
      const payload = {
        id: 1,
        site_name: siteSettings.site_name,
        site_description: siteSettings.site_description,
        logo_url: siteSettings.logo_url,
        primary_color: siteSettings.primary_color,
        secondary_color: siteSettings.secondary_color,
        show_article_summary: siteSettings.show_article_summary,
        meta_title: siteSettings.meta_title,
        meta_description: siteSettings.meta_description,
        og_title: siteSettings.og_title,
        og_description: siteSettings.og_description,
        og_image: siteSettings.og_image,
        twitter_handle: siteSettings.twitter_handle,
        keywords: siteSettings.keywords,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('site_settings').upsert(payload)

      if (error) {
        if (typeof error.message === 'string' && error.message.includes('show_article_summary')) {
          const rest = { ...(payload as unknown as Record<string, unknown>) }
          delete rest.show_article_summary
          const retry = await supabase.from('site_settings').upsert(rest)
          if (retry.error) throw retry.error
          showToast('تم حفظ الإعدادات (يلزم تحديث قاعدة البيانات)')
          return
        }
        throw error
      }

      showToast('تم حفظ الإعدادات بنجاح')
    } catch (error) {
      console.error('Error saving settings:', error)
      showToast('حدث خطأ أثناء حفظ الإعدادات', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSave = async (link: Partial<SocialLink>) => {
    try {
      if (link.id) {
        const { error } = await supabase
          .from('social_links')
          .update({
            platform: link.platform,
            url: link.url,
            icon: link.icon,
            is_active: link.is_active,
            sort_order: link.sort_order
          })
          .eq('id', link.id)
        
        if (error) throw error
        showToast('تم تعديل الرابط بنجاح')
      } else {
        const { error } = await supabase
          .from('social_links')
          .insert([{
            platform: link.platform,
            url: link.url,
            icon: link.icon || 'Link',
            is_active: link.is_active !== false,
            sort_order: link.sort_order || links.length + 1
          }])
        
        if (error) throw error
        showToast('تم إضافة الرابط بنجاح')
      }

      setEditingId(null)
      setNewLink(null)
      fetchLinks()
    } catch (error) {
      console.error('Error saving link:', error)
      showToast('حدث خطأ أثناء الحفظ', 'error')
    }
  }

  const handleDeleteSocial = async () => {
    if (!deleteTarget) return

    try {
      const { error } = await supabase
        .from('social_links')
        .delete()
        .eq('id', deleteTarget.id)

      if (error) throw error
      showToast('تم حذف الرابط بنجاح')
      setDeleteTarget(null)
      fetchLinks()
    } catch (error) {
      console.error('Error deleting link:', error)
      showToast('حدث خطأ أثناء الحذف', 'error')
    }
  }

  const handleSaveShareMessage = async (msg: ShareMessage) => {
    try {
      const { error } = await supabase
        .from('share_messages')
        .update({
          message_template: msg.message_template,
          is_active: msg.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', msg.id)

      if (error) throw error
      setEditingShareId(null)
      showToast('تم حفظ رسالة المشاركة بنجاح')
      fetchShareMessages()
    } catch (error) {
      console.error('Error saving share message:', error)
      showToast('حدث خطأ أثناء الحفظ', 'error')
    }
  }

  const renderForm = (link: Partial<SocialLink>, isNew = false) => {
    const updateLink = (updates: Partial<SocialLink>) => {
      if (isNew) {
        setNewLink(prev => prev ? { ...prev, ...updates } : null)
      } else {
        setLinks(links.map(l => l.id === link.id ? { ...l, ...updates } : l))
      }
    }

    return (
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          value={link.platform || ''}
          onChange={(e) => updateLink({ platform: e.target.value })}
          placeholder="اسم المنصة"
          className="p-2 border rounded bg-background"
        />
        <input
          type="text"
          value={link.url || ''}
          onChange={(e) => updateLink({ url: e.target.value })}
          placeholder="الرابط"
          className="p-2 border rounded bg-background"
        />
        
        <div className="md:col-span-2">
          <label className="text-sm block mb-2 font-medium">الأيقونة:</label>
          <div className="flex flex-wrap gap-2 bg-background p-3 rounded border border-input max-h-40 overflow-y-auto">
            {AVAILABLE_ICONS.map((iconItem) => {
              const Icon = iconItem.icon
              const isSelected = (link.icon || 'Link') === iconItem.name
              return (
                <button
                  key={iconItem.name}
                  onClick={() => updateLink({ icon: iconItem.name })}
                  className={`p-2 rounded border transition-all ${
                    isSelected 
                      ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/30' 
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground border-transparent'
                  }`}
                  title={iconItem.name}
                >
                  <Icon size={20} />
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
           <label className="text-sm">الترتيب:</label>
           <input
            type="number"
            value={link.sort_order || 0}
            onChange={(e) => updateLink({ sort_order: parseInt(e.target.value) })}
            className="p-2 border rounded bg-background w-20"
          />
        </div>
         <div className="flex items-center gap-2">
          <label htmlFor={`active-${isNew ? 'new' : link.id}`} className="text-sm font-medium">
            نشط
          </label>
          <Switch
            id={`active-${isNew ? 'new' : link.id}`}
            checked={link.is_active !== false}
            onCheckedChange={(checked) => updateLink({ is_active: checked })}
          />
        </div>
        
        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
          <button onClick={() => handleSave(link)} className="p-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2">
            <Save size={18} /> حفظ
          </button>
          <button onClick={() => {
            if (isNew) {
              setNewLink(null)
            } else {
              setEditingId(null)
              fetchLinks()
            }
          }} className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2">
            <X size={18} /> إلغاء
          </button>
        </div>
      </div>
    )
  }

  if (loading && activeTab !== 'logo') return <div className="p-8 text-center">جاري التحميل...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إعدادات الموقع</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-lg mb-6 w-fit border border-border flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">المعلومات الأساسية</h2>
            <button 
              onClick={handleSaveSettings} 
              disabled={savingSettings}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70"
            >
              {savingSettings ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              <span>حفظ الإعدادات</span>
            </button>
          </div>

          <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم الموقع</label>
                <input
                  type="text"
                  value={siteSettings.site_name}
                  onChange={(e) => setSiteSettings({ ...siteSettings, site_name: e.target.value })}
                  className="w-full p-2 bg-background border border-input rounded-md"
                  placeholder="اسم الموقع"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">وصف الموقع</label>
                <textarea
                  value={siteSettings.site_description}
                  onChange={(e) => setSiteSettings({ ...siteSettings, site_description: e.target.value })}
                  className="w-full p-2 bg-background border border-input rounded-md min-h-[80px]"
                  placeholder="وصف مختصر يظهر في محركات البحث وتذييل الصفحة"
                />
              </div>

              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-3">
                <label htmlFor="show-article-summary" className="text-sm font-medium">
                  إظهار ملخص المقال أسفل صفحة المقال
                </label>
                <div className="mr-auto">
                  <Switch
                    id="show-article-summary"
                    checked={siteSettings.show_article_summary !== false}
                    onCheckedChange={(checked) => setSiteSettings({ ...siteSettings, show_article_summary: checked })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">اللون الأساسي</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={siteSettings.primary_color}
                      onChange={(e) => setSiteSettings({ ...siteSettings, primary_color: e.target.value })}
                      className="h-10 w-10 p-1 rounded cursor-pointer"
                    />
                    <span className="text-sm font-mono">{siteSettings.primary_color}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">اللون الثانوي</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={siteSettings.secondary_color}
                      onChange={(e) => setSiteSettings({ ...siteSettings, secondary_color: e.target.value })}
                      className="h-10 w-10 p-1 rounded cursor-pointer"
                    />
                    <span className="text-sm font-mono">{siteSettings.secondary_color}</span>
                  </div>
                </div>
              </div>
            </div>
        </div>
      )}

      {activeTab === 'logo' && <LogoController />}

      {/* SEO Tab */}
      {activeTab === 'seo' && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">تحسين محركات البحث (SEO)</h2>
              <p className="text-sm text-muted-foreground mt-1">إعدادات SEO الافتراضية للموقع - تُطبق على جميع الصفحات ما لم يتم تخصيصها لكل مقال</p>
            </div>
            <button 
              onClick={handleSaveSettings} 
              disabled={savingSettings}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70"
            >
              {savingSettings ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              <span>حفظ</span>
            </button>
          </div>

          <div className="space-y-6">
            {/* Meta Tags Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground">وسوم Meta الأساسية</h3>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1">
                    Meta Title (عنوان SEO)
                    <InfoTooltip content={
                      'العنوان الذي يظهر في نتائج محركات البحث وفي تبويب المتصفح.\n\n' +
                      'ما هو؟ نص قصير يلخص محتوى الصفحة ويرىه المستخدم في Google.\n\n' +
                      'الأهمية: هذا أهم عنصر SEO - يؤثر بشكل مباشر على نقرات المستخدمين من نتائج البحث.\n\n' +
                      'الطول المثالي: 50-60 حرف. أكثر من 60 حرف يتم قصه.\n\n' +
                      'مثال: "أخبار الرياضة Latest - تاء بوست"'
                    } />
                  </label>
                  <input
                    type="text"
                    value={siteSettings.meta_title || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, meta_title: e.target.value || null })}
                    className="w-full p-2.5 bg-background border border-input rounded-md text-sm"
                    placeholder="عنوان افتراضي يظهر في نتائج البحث"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">يُفضّل 50-60 حرف | إذا ترك فارغاً، يُستخدم اسم الموقع</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1">
                    Meta Description (وصف SEO)
                    <InfoTooltip content={
                      'الوصف الذي يظهر تحت العنوان في نتائج محركات البحث.\n\n' +
                      'ما هو؟ نص توضيحي قصير يصف محتوى الصفحة للمستخدم.\n\n' +
                      'الأهمية: يؤثر على قرار المستخدم بالضغط على رابطك أم لا. وصف جذاب = نقرات أكثر.\n\n' +
                      'الطول المثالي: 150-160 حرف. أكثر من 160 حرف يتم قصه.\n\n' +
                      'مثال: "تابع آخر الأخبار والمقالات الحصرية على تاء بوست - منصة إعلامية موثوقة تغطي جميع المجالات"'
                    } />
                  </label>
                  <textarea
                    value={siteSettings.meta_description || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, meta_description: e.target.value || null })}
                    className="w-full p-2.5 bg-background border border-input rounded-md text-sm min-h-[80px]"
                    placeholder="وصف مختصر للموقع يظهر في محركات البحث"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">يُفضّل 150-160 حرف | إذا ترك فارغاً، يُستخدم وصف الموقع</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1">
                    الكلمات المفتاحية (Keywords)
                    <InfoTooltip content={
                      'قائمة بالكلمات والمصطلحات المتعلقة بموقعك.\n\n' +
                      'ما هي؟ كلمات مفصولة بفاصلة تساعد محركات البحث على فهم موضوع موقعك.\n\n' +
                      'الأهمية: متوسطة - Google لا يعتمد عليها بشكل كبير اليوم لكنها تساعد في الفهم.\n\n' +
                      'مثال: "أخبار, رياضة, تقنية, سياسة, اقتصاد, تكنولوجيا"'
                    } />
                  </label>
                  <input
                    type="text"
                    value={siteSettings.keywords || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, keywords: e.target.value || null })}
                    className="w-full p-2.5 bg-background border border-input rounded-md text-sm"
                    placeholder="كلمة1, كلمة2, كلمة3"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">افصل بين الكلمات بفاصلة</p>
                </div>
              </div>
            </div>

            {/* Open Graph Section */}
            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold mb-1 text-foreground">Open Graph (مشاركة وسائل التواصل)</h3>
              <p className="text-xs text-muted-foreground mb-3">هذه الحقول تتحكم في شكل المقال عند مشاركته على فيسبوك ولينكد إن وغيرهما</p>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1">
                    OG Title (عنوان المشاركة)
                    <InfoTooltip content={
                      'العنوان الذي يظهر عند مشاركة رابط موقعك على فيسبوك أو لينكد إن.\n\n' +
                      'ما هو؟ نص العنوان في بطاقة المشاركة (Link Preview).\n\n' +
                      'الأهمية: إذا كان مختلفاً عن Meta Title يمكنك تخصيصه لتكون رسالة المشاركة أكثر جاذبية.\n\n' +
                      'إذا ترك فارغاً: يُستخدم Meta Title أو اسم الموقع.\n\n' +
                      'مثال: "اقرأ أحدث المقالات على تاء بوست"'
                    } />
                  </label>
                  <input
                    type="text"
                    value={siteSettings.og_title || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, og_title: e.target.value || null })}
                    className="w-full p-2.5 bg-background border border-input rounded-md text-sm"
                    placeholder="العنوان عند المشاركة على وسائل التواصل"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">يظهر عند المشاركة على فيسبوك ولينكد إن</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1">
                    OG Description (وصف المشاركة)
                    <InfoTooltip content={
                      'الوصف الذي يظهر تحت العنوان في بطاقة المشاركة.\n\n' +
                      'ما هو؟ النص التوضيحي في بطاقة المشاركة على وسائل التواصل.\n\n' +
                      'الأهمية: وصف جذاب يزيد من النقرات والمشاركات.\n\n' +
                      'إذا ترك فارغاً: يُستخدم Meta Description.\n\n' +
                      'مثال: "منصة إعلامية رقمية تقدم آخر الأخبار والمقالات الحصرية"'
                    } />
                  </label>
                  <textarea
                    value={siteSettings.og_description || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, og_description: e.target.value || null })}
                    className="w-full p-2.5 bg-background border border-input rounded-md text-sm min-h-[60px]"
                    placeholder="الوصف عند المشاركة على وسائل التواصل"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">يظهر تحت العنوان في بطاقة المشاركة</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1">
                    OG Image (صورة المشاركة)
                    <InfoTooltip content={
                      'رابط الصورة التي تظهر في بطاقة المشاركة على وسائل التواصل.\n\n' +
                      'ما هي؟ صورة مصغرة تظهر مع العنوان والوصف عند مشاركة أي رابط من موقعك.\n\n' +
                      'الأهمية: المقالات التي بها صورة في المشاركة تحصل على نقرات أكثر بنسبة 50%+.\n\n' +
                      'الحجم المثالي: 1200x630 بكسل (نسبة 1.91:1).\n\n' +
                      'صيغ مدعومة: JPG, PNG. يُفضل حقل أقل من 1MB.\n\n' +
                      'مثال: https://example.com/images/og-default.jpg'
                    } />
                  </label>
                  <input
                    type="text"
                    value={siteSettings.og_image || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, og_image: e.target.value || null })}
                    className="w-full p-2.5 bg-background border border-input rounded-md text-sm"
                    placeholder="https://example.com/og-image.jpg"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">الأبعاد المثالية: 1200x630 بكسل | الصيغ: JPG أو PNG</p>
                </div>
              </div>
            </div>

            {/* Twitter Section */}
            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold mb-1 text-foreground">Twitter / X Card</h3>
              <p className="text-xs text-muted-foreground mb-3">إعدادات بطاقة المشاركة الخاصة بمنصة Twitter / X</p>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1">
                  Twitter Handle (حساب تويتر)
                  <InfoTooltip content={
                    'حساب الموقع الرسمي على Twitter / X.\n\n' +
                    'ما هو؟ اسم المستخدم يبدأ بعلامة @ ويظهر في بطاقة المشاركة كمصدر المحتوى.\n\n' +
                      'الأهمية: يربط المحتوى بحسابك الرسمي ويظهر للمتابعين عند المشاركة.\n\n' +
                      'مثال: @taapost 或 @username'
                  } />
                </label>
                <input
                  type="text"
                  value={siteSettings.twitter_handle || ''}
                  onChange={(e) => setSiteSettings({ ...siteSettings, twitter_handle: e.target.value || null })}
                  className="w-full p-2.5 bg-background border border-input rounded-md text-sm"
                  placeholder="@username"
                />
                <p className="text-xs text-muted-foreground mt-1.5">يجب أن يبدأ بعلامة @</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'social' && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">حسابات التواصل الاجتماعي</h2>
            <button
              onClick={() => setNewLink({ platform: '', url: '', icon: 'Link', is_active: true, sort_order: links.length + 1 })}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Plus size={20} />
              <span>إضافة رابط</span>
            </button>
          </div>
          
          <div className="space-y-4">
            {links.map((link) => (
              <div key={link.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                {editingId === link.id ? (
                  renderForm(link)
                ) : (
                  <>
                    <div className="p-2 bg-background rounded border border-border text-muted-foreground cursor-grab">
                      <GripVertical size={20} />
                    </div>
                    <div className="p-2 bg-background rounded-full border border-border">
                      {(() => {
                        const IconItem = AVAILABLE_ICONS.find(i => i.name === link.icon) || AVAILABLE_ICONS.find(i => i.name === 'Link')
                        const Icon = IconItem?.icon || LinkIcon
                        return <Icon size={20} />
                      })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold flex items-center gap-2">
                        {link.platform}
                        {!link.is_active && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">غير نشط</span>}
                      </div>
                      <div className="text-sm text-muted-foreground truncate w-[220px] sm:w-[260px] md:w-[340px]">{link.url}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(link.id)} className="p-2 hover:bg-muted rounded text-blue-600">تعديل</button>
                      <button onClick={() => setDeleteTarget(link)} className="p-2 hover:bg-muted rounded text-red-600">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {newLink && (
              <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                {renderForm(newLink, true)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Messages Tab */}
      {activeTab === 'share' && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">رسائل المشاركة</h2>
            <p className="text-sm text-muted-foreground mt-1">
              خصص الرسالة المرافقة لكل منصة عند مشاركة المقالات على وسائل التواصل الاجتماعي.
            </p>
          </div>

          {/* Placeholders Guide */}
          <div className="bg-muted/40 rounded-lg border border-border p-4 mb-6">
            <h4 className="text-sm font-semibold mb-2">المتغيرات المتاحة:</h4>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs bg-background px-2.5 py-1.5 rounded-md border border-border">
                <code className="font-mono text-primary font-bold">{`{url}`}</code>
                <span className="text-muted-foreground">← رابط المقال</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs bg-background px-2.5 py-1.5 rounded-md border border-border">
                <code className="font-mono text-primary font-bold">{`{title}`}</code>
                <span className="text-muted-foreground">← عنوان المقال</span>
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {SHARE_PLATFORMS.map((platform) => {
              const msg = shareMessages.find(m => m.platform === platform.key)
              const Icon = platform.icon
              const isEditing = editingShareId === msg?.id

              if (!msg) return null

              return (
                <div key={platform.key} className="rounded-lg border border-border overflow-hidden">
                  {/* Platform Header */}
                  <div className="flex items-center justify-between p-4 bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-background rounded-full border border-border">
                        <Icon size={18} />
                      </div>
                      <div>
                        <span className="font-bold text-sm">{platform.label}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className={`w-2 h-2 rounded-full ${msg.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="text-xs text-muted-foreground">
                            {msg.is_active ? 'نشطة - سيتم استخدام الرسالة المخصصة' : 'معطلة - سيتم مشاركة الرابط فقط بدون رسالة'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {msg.is_active ? 'مفعّلة' : 'معطّلة'}
                      </span>
                      <Switch
                        checked={msg.is_active}
                        onCheckedChange={(checked) => {
                          setShareMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_active: checked } : m))
                        }}
                      />
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={msg.message_template}
                          onChange={(e) => {
                            setShareMessages(prev => prev.map(m => m.id === msg.id ? { ...m, message_template: e.target.value } : m))
                          }}
                          rows={3}
                          className="w-full p-3 bg-background border border-input rounded-md text-sm leading-relaxed"
                          placeholder="اكتب الرسالة هنا..."
                        />
                        <p className="text-xs text-muted-foreground">
                          مثال: {" "} تابعوا "{`{title}`}" على موقعنا {`{url}`}
                        </p>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setShareMessages(prev => prev.map(m => m.id === msg.id ? { ...shareMessages.find(sm => sm.id === msg.id)! } : m))
                              setEditingShareId(null)
                            }}
                            className="px-3 py-1.5 text-sm border border-input rounded-md hover:bg-muted transition-colors"
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={() => handleSaveShareMessage(msg)}
                            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                          >
                            حفظ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="bg-background p-3 rounded-md border border-border mb-3">
                          <p className="text-sm text-foreground leading-relaxed">
                            {msg.message_template || <span className="text-muted-foreground italic">فارغ - سيتم مشاركة الرابط فقط</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => setEditingShareId(msg.id)}
                          className="text-sm text-primary hover:underline font-medium"
                        >
                          تعديل الرسالة
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="حذف الرابط"
        message={`هل أنت متأكد من حذف رابط "${deleteTarget?.platform}"؟`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDeleteSocial}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
