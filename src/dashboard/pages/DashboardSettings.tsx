import { useEffect, useState } from 'react'
import { Save, Plus, Trash2, GripVertical, Check, X, Facebook, Twitter, Instagram, Linkedin, Youtube, MessageCircle, Send, Mail, Globe, Link as LinkIcon, Loader2 } from 'lucide-react'
import { supabase, type SocialLink } from '../../lib/supabase'
import ImageUpload from '../components/ImageUpload'

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
}

export default function DashboardSettings() {
  const [links, setLinks] = useState<SocialLink[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newLink, setNewLink] = useState<Partial<SocialLink> | null>(null)
  
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    id: 1,
    site_name: '',
    site_description: '',
    logo_url: null,
    primary_color: '#8B4513',
    secondary_color: '#000000'
  })
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      await Promise.all([fetchLinks(), fetchSiteSettings()])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSiteSettings() {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .single()
    
    if (error) {
      if (error.code !== 'PGRST116') { // Not found error code might differ, but single() returns error if no rows
        console.error('Error fetching site settings:', error)
      }
    } else if (data) {
      setSiteSettings(data)
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

  async function handleSaveSettings() {
    try {
      setSavingSettings(true)
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: 1,
          ...siteSettings,
          updated_at: new Date().toISOString()
        })
      
      if (error) throw error
      alert('تم حفظ إعدادات الموقع بنجاح')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('حدث خطأ أثناء حفظ الإعدادات')
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
      }

      setEditingId(null)
      setNewLink(null)
      fetchLinks()
    } catch (error) {
      console.error('Error saving link:', error)
      alert('حدث خطأ أثناء الحفظ')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرابط؟')) return

    try {
      const { error } = await supabase
        .from('social_links')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchLinks()
    } catch (error) {
      console.error('Error deleting link:', error)
      alert('حدث خطأ أثناء الحذف')
    }
  }

  const renderForm = (link: Partial<SocialLink>, isNew: boolean = false) => {
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
          <input
            type="checkbox"
            checked={link.is_active !== false}
            onChange={(e) => updateLink({ is_active: e.target.checked })}
            id={`active-${isNew ? 'new' : link.id}`}
          />
          <label htmlFor={`active-${isNew ? 'new' : link.id}`}>نشط</label>
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
              fetchLinks() // Reset changes
            }
          }} className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2">
            <X size={18} /> إلغاء
          </button>
        </div>
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إعدادات الموقع</h1>
        <button
          onClick={() => setNewLink({ platform: '', url: '', icon: 'Link', is_active: true, sort_order: links.length + 1 })}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          <span>إضافة رابط</span>
        </button>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-8">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div>
            <label className="block text-sm font-medium mb-2">شعار الموقع (اللوجو)</label>
            <div className="bg-muted/30 p-4 rounded-lg border border-border">
              <ImageUpload
                value={siteSettings.logo_url || ''}
                onChange={(url) => setSiteSettings({ ...siteSettings, logo_url: url })}
                bucket="media"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                يفضل استخدام صورة بخلفية شفافة (PNG) بحجم لا يقل عن 200x200 بكسل
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">حسابات التواصل الاجتماعي</h2>
        
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
                  <div className="flex-1">
                    <div className="font-bold flex items-center gap-2">
                      {link.platform}
                      {!link.is_active && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">غير نشط</span>}
                    </div>
                    <div className="text-sm text-muted-foreground truncate max-w-xs">{link.url}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(link.id)} className="p-2 hover:bg-muted rounded text-blue-600">تعديل</button>
                    <button onClick={() => handleDelete(link.id)} className="p-2 hover:bg-muted rounded text-red-600">
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
    </div>
  )
}
