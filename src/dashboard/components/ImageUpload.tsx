import { useCallback, useEffect, useState } from 'react'
import { Upload, X, Loader2, Crop, RotateCcw, Check } from 'lucide-react'
import Cropper, { type Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { supabase } from '../../lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import { getCroppedImage, getImageDimensions } from '../utils/cropImage'

type Props = {
  value: string
  onChange: (url: string) => void
  label?: string
  className?: string
  caption?: string
  onCaptionChange?: (caption: string) => void
  showCaption?: boolean
}

type AspectOption = { label: string; value: number | null }

const ASPECTS: AspectOption[] = [
  { label: 'حر (الأصل)', value: null },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
]

export default function ImageUpload({ value, onChange, label = 'صورة', className = '', caption = '', onCaptionChange, showCaption = false }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<string>('')

  // محرر القص
  const [editorOpen, setEditorOpen] = useState(false)
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceFileName, setSourceFileName] = useState('image.jpg')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspectIdx, setAspectIdx] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [croppedPreview, setCroppedPreview] = useState('')

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  // أبعاد الصورة المحفوظة للعرض
  useEffect(() => {
    if (!value) {
      setDimensions('')
      return
    }
    let cancelled = false
    getImageDimensions(value)
      .then(({ width, height }) => {
        if (!cancelled) setDimensions(`${width} × ${height}`)
      })
      .catch(() => {
        if (!cancelled) setDimensions('')
      })
    return () => {
      cancelled = true
    }
  }, [value])

  // تنظيف object URLs
  useEffect(() => {
    return () => {
      if (sourceUrl.startsWith('blob:')) URL.revokeObjectURL(sourceUrl)
    }
  }, [sourceUrl])

  const uploadBlob = async (blob: Blob, originalName: string) => {
    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg'
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg'
    const fileName = `${uuidv4()}.${safeExt}`
    const { error: uploadError } = await supabase.storage.from('media').upload(fileName, blob)
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('media').getPublicUrl(fileName)
    onChange(data.publicUrl)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // السماح باختيار نفس الملف مرة أخرى
    event.target.value = ''
    if (!file) return
    setError(null)
    setSourceFileName(file.name)
    setSourceUrl(URL.createObjectURL(file))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setCroppedPreview('')
    setEditorOpen(true)
  }

  const handleUploadOriginal = async () => {
    try {
      setUploading(true)
      const res = await fetch(sourceUrl)
      const blob = await res.blob()
      await uploadBlob(blob, sourceFileName)
      closeEditor()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء رفع الصورة'
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  const handleApplyCrop = async () => {
    try {
      if (!croppedAreaPixels) {
        // بدون منطقة قص (وضع حر بدون تحريك) ارفع الأصل
        await handleUploadOriginal()
        return
      }
      setUploading(true)
      setError(null)
      const { blob, dataUrl } = await getCroppedImage(sourceUrl, croppedAreaPixels)
      setCroppedPreview(dataUrl)
      await uploadBlob(blob, sourceFileName)
      closeEditor()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء قص الصورة'
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  const closeEditor = () => {
    setEditorOpen(false)
    if (sourceUrl.startsWith('blob:')) URL.revokeObjectURL(sourceUrl)
    setSourceUrl('')
    setCroppedAreaPixels(null)
  }

  const handleRemove = () => {
    onChange('')
  }

  const aspect = ASPECTS[aspectIdx].value ?? undefined

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>

      {value ? (
        <div className="space-y-2">
          {/* معاينة بنفس شكل صفحة المقال: كاملة + خلفية ضبابية */}
          <div className="relative w-full max-w-md rounded-lg overflow-hidden border border-border bg-muted/30">
            <div className="relative w-full overflow-hidden">
              <img
                src={value}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-40 select-none"
              />
              <img
                src={value}
                alt="Uploaded preview"
                className="relative z-10 mx-auto w-full h-auto max-h-[320px] object-contain"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute z-20 top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          {dimensions && (
            <p className="text-xs text-muted-foreground">الأبعاد: <span dir="ltr">{dimensions}</span> — ستظهر كاملة في صفحة المقال</p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <Loader2 className="w-8 h-8 mb-2 text-muted-foreground animate-spin" />
              ) : (
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
              )}
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">اضغط للرفع</span> ثم قص وتحكم قبل الحفظ
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5MB</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
        </div>
      )}

      {showCaption && value && onCaptionChange && (
        <div className="mt-2">
          <input
            type="text"
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="التسمية التوضيحية للصورة (اختياري)"
            className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-sm"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}

      {/* نافذة محرر القص والمعاينة */}
      {editorOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[80] p-4" onClick={closeEditor}>
          <div
            className="bg-card rounded-lg shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-border p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <Crop size={20} className="text-primary" />
              تحكم في الصورة قبل الرفع
            </h3>
            <p className="text-xs text-muted-foreground mb-4">حرّك وزوّم واختر النسبة — المعاينة بالأسفل مطابقة لشكلها في صفحة المقال (كاملة + خلفية ضبابية).</p>

            <div className="relative w-full h-[320px] rounded-lg overflow-hidden bg-black/80">
              <Cropper
                image={sourceUrl}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-xs font-medium text-foreground">النسبة:</span>
              {ASPECTS.map((a, i) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => setAspectIdx(i)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    i === aspectIdx
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-input hover:text-foreground'
                  }`}
                >
                  {a.label}
                </button>
              ))}
              <div className="flex items-center gap-2 mr-auto min-w-[180px] flex-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">زوم</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
                <button
                  type="button"
                  onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1) }}
                  className="p-1.5 rounded-md border border-input text-muted-foreground hover:text-foreground"
                  title="إعادة ضبط"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* معاينة حية كما ستظهر في المقال */}
            <div className="mt-4">
              <p className="text-xs font-medium text-foreground mb-2">معاينة صفحة المقال:</p>
              <div className="relative w-full rounded-lg overflow-hidden border border-border bg-muted/30">
                <div className="relative w-full overflow-hidden">
                  <img
                    src={croppedPreview || sourceUrl}
                    alt=""
                    aria-hidden
                    className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-40 select-none"
                  />
                  <img
                    src={croppedPreview || sourceUrl}
                    alt="معاينة المقال"
                    className="relative z-10 mx-auto w-full h-auto max-h-[280px] object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={closeEditor}
                disabled={uploading}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleUploadOriginal}
                disabled={uploading}
                className="px-4 py-2 border border-input rounded-lg text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {uploading ? 'جاري الرفع...' : 'رفع الأصل بدون قص'}
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                disabled={uploading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                اعتماد القص والرفع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
