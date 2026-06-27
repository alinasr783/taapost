import { useState, useEffect, useCallback, useRef } from 'react'
import { Save, Plus, Trash2, Loader2, Image, Check, GripHorizontal } from 'lucide-react'
import { supabase, type LogoSetting } from '../../lib/supabase'
import ImageUpload from '../components/ImageUpload'
import ConfirmDialog from './ConfirmDialog'
import { useToast } from './Toast'

const PRESET_WIDTHS = ['25%', '50%', '75%', '100%']
const PRESET_HEIGHTS = ['auto', '40px', '60px', '80px', '120px']
const PRESET_MAX_WIDTHS = ['none', '200px', '300px', '400px', '500px']

export default function LogoController() {
  const { showToast } = useToast()
  const [logos, setLogos] = useState<LogoSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingLogo, setEditingLogo] = useState<LogoSetting | null>(null)
  const [newLogo, setNewLogo] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  useEffect(() => {
    fetchLogos()
  }, [])

  async function fetchLogos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('logo_settings')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching logos:', error)
    } else if (data) {
      setLogos(data as LogoSetting[])
    }
    setLoading(false)
  }

  function getDefaultLogo(): Omit<LogoSetting, 'id' | 'created_at' | 'updated_at'> {
    return {
      logo_url: '',
      logo_url_dark: null,
      logo_name: 'اللوجو الرئيسي',
      is_active: logos.length === 0,
      logo_width: '100%',
      logo_max_width: 'none',
      logo_height: 'auto',
      position_x: 50,
      position_y: 50,
      alignment: 'center',
    }
  }

  async function handleSave(logo: LogoSetting | Omit<LogoSetting, 'id' | 'created_at' | 'updated_at'>) {
    try {
      setSaving(true)

      if ('id' in logo && logo.id) {
        if (logo.is_active) {
          await supabase.from('logo_settings').update({ is_active: false }).neq('id', logo.id)
        }
        const { error } = await supabase
          .from('logo_settings')
          .update({
            logo_url: logo.logo_url,
            logo_url_dark: logo.logo_url_dark || null,
            logo_name: logo.logo_name,
            is_active: logo.is_active,
            logo_width: logo.logo_width,
            logo_max_width: logo.logo_max_width,
            logo_height: logo.logo_height,
            position_x: logo.position_x,
            position_y: logo.position_y,
            alignment: logo.alignment,
            updated_at: new Date().toISOString(),
          })
          .eq('id', logo.id)
        if (error) throw error
      } else {
        if (logo.is_active) {
          await supabase.from('logo_settings').update({ is_active: false }).neq('id', 0)
        }
        const { error } = await supabase
          .from('logo_settings')
          .insert([{
            logo_url: logo.logo_url,
            logo_url_dark: logo.logo_url_dark || null,
            logo_name: logo.logo_name,
            is_active: logo.is_active,
            logo_width: logo.logo_width,
            logo_max_width: logo.logo_max_width,
            logo_height: logo.logo_height,
            position_x: logo.position_x,
            position_y: logo.position_y,
            alignment: logo.alignment,
          }])
        if (error) throw error
      }

      setEditingLogo(null)
      setNewLogo(false)
      await fetchLogos()
      showToast(editingLogo ? 'تم تعديل اللوجو بنجاح' : 'تم إضافة اللوجو بنجاح', 'success')
    } catch (error) {
      console.error('Error saving logo:', error)
      showToast('حدث خطأ أثناء حفظ اللوجو', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openDeleteConfirm = (id: number) => {
    setDeleteTarget(id)
    setConfirmOpen(true)
  }

  async function handleDelete() {
    if (deleteTarget === null) return
    const { error } = await supabase.from('logo_settings').delete().eq('id', deleteTarget)
    if (error) {
      console.error('Error deleting logo:', error)
      showToast('حدث خطأ أثناء الحذف', 'error')
    } else {
      showToast('تم حذف اللوجو بنجاح', 'success')
      fetchLogos()
    }
    setConfirmOpen(false)
    setDeleteTarget(null)
  }

  async function toggleActive(logo: LogoSetting) {
    if (logo.is_active) return
    await supabase.from('logo_settings').update({ is_active: false }).neq('id', logo.id)
    await supabase.from('logo_settings').update({ is_active: true }).eq('id', logo.id)
    fetchLogos()
  }

  if (loading) return <div className="text-center py-8">جاري التحميل...</div>

  return (
    <div className="space-y-8">
      {/* Logo List */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">اللوجوهات المحفوظة</h2>
          <button
            onClick={() => {
              setEditingLogo(null)
              setNewLogo(true)
            }}
            disabled={newLogo || editingLogo !== null}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus size={20} />
            <span>إضافة لوجو جديد</span>
          </button>
        </div>

        {logos.length === 0 && !newLogo && (
          <div className="text-center py-8 text-muted-foreground">
            <Image size={48} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد لوجوهات. أضف لوجو جديد للبدء.</p>
          </div>
        )}

        <div className="space-y-3">
          {logos.map((logo) => (
            <div
              key={logo.id}
              className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                logo.is_active
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-muted/30 border-border'
              }`}
            >
              <div className="w-16 h-16 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden flex-shrink-0">
                {logo.logo_url ? (
                  <img
                    src={logo.logo_url}
                    alt={logo.logo_name}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <Image size={24} className="text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold flex items-center gap-2">
                  {logo.logo_name}
                  {logo.is_active && (
                    <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                      نشط
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  العرض: {logo.logo_width} | المحاذاة: {logo.alignment}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!logo.is_active && (
                  <button
                    onClick={() => toggleActive(logo)}
                    className="p-2 hover:bg-green-100 dark:hover:bg-green-900/20 rounded text-green-600 transition-colors"
                    title="تفعيل هذا اللوجو"
                  >
                    <Check size={18} />
                  </button>
                )}
                <button
                  onClick={() => {
                    setNewLogo(false)
                    setEditingLogo(logo)
                  }}
                  disabled={newLogo || (editingLogo !== null && editingLogo.id !== logo.id)}
                  className="p-2 hover:bg-muted rounded text-blue-600 transition-colors disabled:opacity-50"
                >
                  تعديل
                </button>
                <button
                  onClick={() => openDeleteConfirm(logo.id)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New / Edit Logo Form */}
      {(newLogo || editingLogo) && (
        <LogoEditor
          logo={editingLogo ?? ({ ...getDefaultLogo(), id: 0 } as LogoSetting)}
          isNew={newLogo}
          saving={saving}
          onSave={handleSave}
          onCancel={() => {
            setEditingLogo(null)
            setNewLogo(false)
          }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="حذف اللوجو"
        message="هل أنت متأكد من حذف هذا اللوجو؟ لن تتمكن من التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteTarget(null) }}
      />
    </div>
  )
}

function LogoEditor({
  logo,
  isNew,
  saving,
  onSave,
  onCancel,
}: {
  logo: LogoSetting
  isNew: boolean
  saving: boolean
  onSave: (logo: LogoSetting) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<LogoSetting>({ ...logo })
  const previewRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    setForm({ ...logo })
  }, [logo])

  const update = (updates: Partial<LogoSetting>) => {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  // Drag & drop for logo position in header preview
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)

    const container = previewRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()

    const onMove = (moveEvent: MouseEvent) => {
      const x = moveEvent.clientX - rect.left
      const y = moveEvent.clientY - rect.top
      const px = Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)))
      const py = Math.max(0, Math.min(100, Math.round((y / rect.height) * 100)))
      setForm((prev) => ({ ...prev, position_x: px, position_y: py }))
    }

    const onUp = () => {
      setDragging(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const handleAlign = (align: string) => {
    const positions: Record<string, { px: number; py: number }> = {
      left: { px: 5, py: 50 },
      center: { px: 50, py: 50 },
      right: { px: 95, py: 50 },
    }
    const pos = positions[align] ?? positions.center
    update({ alignment: align, position_x: pos.px, position_y: pos.py })
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-8">
      <h2 className="text-xl font-semibold">
        {isNew ? 'إضافة لوجو جديد' : 'تعديل اللوجو'}
      </h2>

      {/* Logo Upload & Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">صورة اللوجو (الوضع النهاري)</label>
          <div className="bg-muted/30 p-4 rounded-lg border border-border">
            <ImageUpload
              value={form.logo_url}
              onChange={(url) => update({ logo_url: url })}
              label="لوجو Light Mode"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">صورة اللوجو (الوضع الليلي) <span className="text-muted-foreground">- اختياري</span></label>
          <div className="bg-muted/30 p-4 rounded-lg border border-border">
            <ImageUpload
              value={form.logo_url_dark || ''}
              onChange={(url) => update({ logo_url_dark: url })}
              label="لوجو Dark Mode"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-center">اتركه فارغاً لاستخدام لوجو النهاري في كلا الوضعين</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">اسم اللوجو</label>
          <input
            type="text"
            value={form.logo_name}
            onChange={(e) => update({ logo_name: e.target.value })}
            className="w-full p-2 bg-background border border-input rounded-md"
            placeholder="اسم مرجعي للوجو"
          />
        </div>
        <label className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => update({ is_active: e.target.checked })}
            className="w-5 h-5 rounded accent-primary"
          />
          <span className="text-sm font-medium">تفعيل هذا اللوجو في الموقع</span>
          </label>
        </div>

      {/* Size Controls */}
      <div>
        <h3 className="text-lg font-semibold mb-4">إعدادات الحجم</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Width */}
          <div>
            <label className="block text-sm font-medium mb-2">عرض اللوجو</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {PRESET_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => update({ logo_width: w })}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    form.logo_width === w
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-muted'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.logo_width}
              onChange={(e) => update({ logo_width: e.target.value })}
              className="w-full p-2 bg-background border border-input rounded-md text-sm"
              placeholder="مثال: 100% أو 300px"
            />
          </div>

          {/* Max Width */}
          <div>
            <label className="block text-sm font-medium mb-2">أقصى عرض</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {PRESET_MAX_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => update({ logo_max_width: w })}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    form.logo_max_width === w
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-muted'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.logo_max_width}
              onChange={(e) => update({ logo_max_width: e.target.value })}
              className="w-full p-2 bg-background border border-input rounded-md text-sm"
              placeholder="مثال: 400px أو none"
            />
          </div>

          {/* Height */}
          <div>
            <label className="block text-sm font-medium mb-2">ارتفاع اللوجو</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {PRESET_HEIGHTS.map((h) => (
                <button
                  key={h}
                  onClick={() => update({ logo_height: h })}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    form.logo_height === h
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-muted'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.logo_height}
              onChange={(e) => update({ logo_height: e.target.value })}
              className="w-full p-2 bg-background border border-input rounded-md text-sm"
              placeholder="مثال: auto أو 60px"
            />
          </div>
        </div>
      </div>

      {/* Header Preview with Drag & Drop */}
      <div>
        <h3 className="text-lg font-semibold mb-4">معاينة مكان اللوجو في الهيدر</h3>
        <p className="text-sm text-muted-foreground mb-3">
          اسحب اللوجو داخل الشريط لتحديد موقعه أو اختر المحاذاة من الأسفل
        </p>

        {/* Alignment Buttons */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'left', label: 'يسار' },
            { key: 'center', label: 'وسط' },
            { key: 'right', label: 'يمين' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleAlign(key)}
              className={`px-4 py-2 rounded-md text-sm border transition-colors ${
                form.alignment === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-input hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Draggable Header Preview */}
        <div
          ref={previewRef}
          className="relative w-full h-24 bg-muted/40 rounded-lg border-2 border-dashed border-border overflow-hidden select-none"
        >
          {/* Grid lines */}
          <div className="absolute inset-0 flex">
            <div className="flex-1 border-r border-border/30" />
            <div className="flex-1 border-r border-border/30" />
            <div className="flex-1" />
          </div>
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 border-b border-border/30" />
            <div className="flex-1" />
          </div>

          {form.logo_url ? (
            <div
              ref={logoRef}
              onMouseDown={handleMouseDown}
              className={`absolute cursor-grab transition-shadow ${
                dragging ? 'cursor-grabbing shadow-lg ring-2 ring-primary z-10' : 'hover:shadow-md'
              }`}
              style={{
                left: `${form.position_x}%`,
                top: `${form.position_y}%`,
                transform: 'translate(-50%, -50%)',
                width: form.logo_width === 'auto' ? 'auto' : form.logo_width,
                maxWidth: form.logo_max_width !== 'none' ? form.logo_max_width : undefined,
                height: form.logo_height !== 'auto' ? form.logo_height : 'auto',
              }}
            >
              <img
                src={form.logo_url}
                alt="Logo preview"
                className="object-contain pointer-events-none"
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '72px',
                }}
                draggable={false}
              />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded whitespace-nowrap pointer-events-none">
                <GripHorizontal size={12} className="inline mr-1" />
                اسحب للتحريك
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              ارفع لوجو للمعاينة
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span>الموقع: X={form.position_x}% Y={form.position_y}%</span>
          <span>المحاذاة: {form.alignment}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          إلغاء
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.logo_url}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          <span>{saving ? 'جاري الحفظ...' : 'حفظ اللوجو'}</span>
        </button>
      </div>
    </div>
  )
}
