import { useEffect, useRef, useState } from 'react'
import { Upload, X, Loader2, RefreshCw, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import ImageCropEditor, { type AspectKey } from './ImageCropEditor'

type Props = {
  value: string
  onChange: (url: string) => void
  label?: string
  className?: string
  caption?: string
  onCaptionChange?: (caption: string) => void
  showCaption?: boolean
  /** النسبة الافتراضية المقترحة في المحرر (للمقالات 16/9) */
  defaultAspect?: AspectKey
  /** إظهار معاينة الأشكال (بطاقة/مربع/دائري) بعد الرفع */
  showShapePreview?: boolean
  /** تفعيل محرر القص قبل الرفع */
  enableCrop?: boolean
}

export default function ImageUpload({
  value,
  onChange,
  label = 'صورة',
  className = '',
  caption = '',
  onCaptionChange,
  showCaption = false,
  defaultAspect = '16/9',
  showShapePreview = true,
  enableCrop = true,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [imgInfo, setImgInfo] = useState<string>('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Revoke object URLs
  useEffect(() => {
    return () => {
      if (pendingUrl) URL.revokeObjectURL(pendingUrl)
    }
  }, [pendingUrl])

  // Load dimensions info for uploaded value
  useEffect(() => {
    if (!value) {
      setImgInfo('')
      return
    }
    const img = new Image()
    img.onload = () => setImgInfo(`${img.naturalWidth} × ${img.naturalHeight}`)
    img.onerror = () => setImgInfo('')
    img.src = value
  }, [value])

  const uploadBlob = async (blob: Blob, ext = 'jpg') => {
    setUploading(true)
    setError(null)
    try {
      const fileName = `${uuidv4()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('media').upload(fileName, blob, {
        contentType: blob.type || 'image/jpeg',
      })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('media').getPublicUrl(fileName)
      onChange(data.publicUrl)
      // cleanup editor
      if (pendingUrl) URL.revokeObjectURL(pendingUrl)
      setPendingUrl(null)
      setPendingFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err: unknown) {
      console.error('Error uploading image:', err)
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء رفع الصورة')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('الملف المختار ليس صورة صالحة')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('حجم الصورة كبير (الحد 8MB)')
      return
    }
    if (!enableCrop) {
      void uploadBlob(file, file.name.split('.').pop() || 'jpg')
      return
    }
    // Open crop editor
    if (pendingUrl) URL.revokeObjectURL(pendingUrl)
    setPendingFile(file)
    setPendingUrl(URL.createObjectURL(file))
  }

  const handleEditorConfirm = (blob: Blob) => {
    void uploadBlob(blob, 'jpg')
  }

  const handleSkipOriginal = () => {
    if (pendingFile) void uploadBlob(pendingFile, pendingFile.name.split('.').pop() || 'jpg')
  }

  const handleRemove = () => {
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleReplace = () => {
    inputRef.current?.click()
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>

      {value ? (
        <div className="space-y-3">
          {/* Full preview — shows complete image without forced cropping */}
          <div className="relative w-full max-w-sm rounded-lg overflow-hidden border border-border bg-muted/40">
            <img src={value} alt="Uploaded preview" className="w-full h-auto max-h-64 object-contain mx-auto" />
            <button
              type="button"
              onClick={handleRemove}
              title="إزالة الصورة"
              className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive"
            >
              <X size={14} />
            </button>
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>
          {imgInfo && <p className="text-[11px] text-muted-foreground">أبعاد الصورة: {imgInfo} — تظهر كاملة في الواجهة بدون قص</p>}

          {/* How it will look in different shapes */}
          {showShapePreview && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 max-w-sm">
              <p className="text-[11px] font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Eye size={12} /> هكذا ستظهر الصورة كاملة في المنصة:
              </p>
              <div className="flex items-end gap-3">
                <div className="text-center space-y-1">
                  <div className="w-32 aspect-video rounded-md overflow-hidden border border-border bg-black/5">
                    <img src={value} alt="بطاقة" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">بطاقة</span>
                </div>
                <div className="text-center space-y-1">
                  <div className="w-14 h-14 rounded-md overflow-hidden border border-border bg-black/5">
                    <img src={value} alt="مربع" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">مربع</span>
                </div>
                <div className="text-center space-y-1">
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-border bg-black/5">
                    <img src={value} alt="دائري" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">دائري</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReplace}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs border border-input rounded-lg px-3 py-2 hover:border-primary/50 disabled:opacity-50"
            >
              <RefreshCw size={13} /> استبدال بصورة أخرى (مع معاينة وضبط)
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <div
            role="button"
            tabIndex={0}
            onClick={handleReplace}
            onKeyDown={(e) => e.key === 'Enter' && handleReplace()}
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <Loader2 className="w-8 h-8 mb-2 text-muted-foreground animate-spin" />
              ) : (
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
              )}
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">اضغط للرفع</span> أو اسحب الصورة هنا
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 8MB — مع معاينة وضبط قبل الرفع</p>
            </div>
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} disabled={uploading} />

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

      {error && <p className="text-sm text-destructive mt-1">{error}</p>}

      {/* Crop editor modal */}
      {pendingUrl && (
        <ImageCropEditor
          imageSrc={pendingUrl}
          fileName={pendingFile?.name || 'image.jpg'}
          defaultAspect={defaultAspect}
          onClose={() => {
            if (pendingUrl) URL.revokeObjectURL(pendingUrl)
            setPendingUrl(null)
            setPendingFile(null)
            if (inputRef.current) inputRef.current.value = ''
          }}
          onConfirm={handleEditorConfirm}
          onSkipOriginal={handleSkipOriginal}
        />
      )}
    </div>
  )
}
