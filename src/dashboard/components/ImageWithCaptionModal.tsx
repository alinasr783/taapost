import { useState } from 'react'
import { Image, Captions, Link2 } from 'lucide-react'
import ImageUpload from './ImageUpload'

type Props = {
  open: boolean
  onClose: () => void
  onInsert: (marker: string) => void
}

export default function ImageWithCaptionModal({ open, onClose, onInsert }: Props) {
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [caption, setCaption] = useState('')

  if (!open) return null

  const finalUrl = (uploadedUrl || urlInput.trim()).trim()

  const reset = () => {
    setUploadedUrl('')
    setUrlInput('')
    setCaption('')
  }

  const handleInsert = () => {
    if (!finalUrl) return
    const safeCaption = caption.trim()
    const marker = safeCaption
      ? `{{image:${finalUrl}|${encodeURIComponent(safeCaption)}}}`
      : `{{image:${finalUrl}}}`
    onInsert(marker)
    reset()
    onClose()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4"
      onClick={handleClose}
    >
      <div
        className="bg-card rounded-lg shadow-xl w-full max-w-md p-6 border border-border mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Image size={20} className="text-primary" />
          إضافة صورة مع تسمية توضيحية
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">رفع صورة</label>
            <ImageUpload
              value={uploadedUrl}
              onChange={setUploadedUrl}
              label="اختر صورة"
              showCaption={false}
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>أو</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1.5">
              <Link2 size={14} />
              الصق رابط الصورة
            </label>
            <input
              type="text"
              dir="ltr"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInsert()}
              placeholder="https://example.com/image.jpg"
              className="w-full p-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1.5">
              <Captions size={14} />
              التسمية التوضيحية (اختياري)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInsert()}
              placeholder="مثال: صورة من مصدر كذا"
              className="w-full p-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  إلغاء
                </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!finalUrl}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Image size={16} />
            إدراج الصورة
          </button>
        </div>
      </div>
    </div>
  )
}
