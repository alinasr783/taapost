import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ZoomIn, Move, RotateCcw, Check, Image as ImageIcon } from 'lucide-react'

export type AspectKey = 'free' | '16/9' | '4/3' | '1/1' | '3/4'

export const ASPECTS: { key: AspectKey; label: string; ratio: number | null }[] = [
  { key: 'free', label: 'حر (كاملة بدون قص)', ratio: null },
  { key: '16/9', label: 'مستطيل 16:9', ratio: 16 / 9 },
  { key: '4/3', label: 'مستطيل 4:3', ratio: 4 / 3 },
  { key: '1/1', label: 'مربع 1:1', ratio: 1 },
  { key: '3/4', label: 'طولي 3:4', ratio: 3 / 4 },
]

type Props = {
  imageSrc: string
  fileName?: string
  defaultAspect?: AspectKey
  onClose: () => void
  onConfirm: (blob: Blob) => void
  onSkipOriginal?: () => void
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export default function ImageCropEditor({
  imageSrc,
  fileName = 'image.jpg',
  defaultAspect = '16/9',
  onClose,
  onConfirm,
  onSkipOriginal,
}: Props) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [aspect, setAspect] = useState<AspectKey>(defaultAspect)
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0) // -0.5 .. 0.5
  const [offsetY, setOffsetY] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [working, setWorking] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)

  // Load natural size
  useEffect(() => {
    const img = new Image()
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = imageSrc
    imgRef.current = img
  }, [imageSrc])

  const getTargetRatio = useCallback(() => {
    const found = ASPECTS.find((a) => a.key === aspect)
    if (!found?.ratio) return natural ? natural.w / natural.h : 16 / 9
    return found.ratio
  }, [aspect, natural])

  const computeCropRect = useCallback(() => {
    if (!natural) return null
    const { w: nw, h: nh } = natural
    const target = getTargetRatio()
    let baseW: number
    let baseH: number
    if (nw / nh > target) {
      baseH = nh
      baseW = nh * target
    } else {
      baseW = nw
      baseH = nw / target
    }
    const cropW = baseW / zoom
    const cropH = baseH / zoom
    // offset is fraction of base size
    let cx = nw / 2 + offsetX * baseW
    let cy = nh / 2 + offsetY * baseH
    cx = clamp(cx, cropW / 2, nw - cropW / 2)
    cy = clamp(cy, cropH / 2, nh - cropH / 2)
    return { x: cx - cropW / 2, y: cy - cropH / 2, w: cropW, h: cropH }
  }, [natural, getTargetRatio, zoom, offsetX, offsetY])

  const renderToCanvas = useCallback(
    (maxSize = 600) => {
      const img = imgRef.current
      const rect = computeCropRect()
      if (!img || !rect || !natural) return null
      const scale = Math.min(1, maxSize / Math.max(rect.w, rect.h))
      // For output keep reasonable resolution (up to 1600)
      const outW = Math.round(rect.w * scale)
      const outH = Math.round(rect.h * scale)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, outW)
      canvas.height = Math.max(1, outH)
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, canvas.width, canvas.height)
      return canvas
    },
    [computeCropRect, natural]
  )

  // Live preview (low-res)
  useEffect(() => {
    if (!natural) return
    const t = setTimeout(() => {
      const canvas = renderToCanvas(600)
      if (canvas) setPreviewUrl(canvas.toDataURL('image/jpeg', 0.85))
    }, 60)
    return () => clearTimeout(t)
  }, [natural, zoom, offsetX, offsetY, aspect, renderToCanvas])

  const handleConfirm = async () => {
    try {
      setWorking(true)
      // High-res export (up to 1600px)
      const img = imgRef.current
      const rect = computeCropRect()
      if (!img || !rect) return
      const maxOut = 1600
      const scale = Math.min(1, maxOut / Math.max(rect.w, rect.h))
      // If free + zoom==1 + centered → export original resolution to keep quality
      const isOriginal = aspect === 'free' && zoom === 1 && offsetX === 0 && offsetY === 0
      const canvas = document.createElement('canvas')
      if (isOriginal) {
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
      } else {
        canvas.width = Math.max(1, Math.round(rect.w * scale))
        canvas.height = Math.max(1, Math.round(rect.h * scale))
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      if (isOriginal) {
        ctx.drawImage(img, 0, 0)
      } else {
        ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, canvas.width, canvas.height)
      }
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
      if (blob) onConfirm(blob)
    } finally {
      setWorking(false)
    }
  }

  const handleReset = () => {
    setZoom(1)
    setOffsetX(0)
    setOffsetY(0)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || !boxRef.current) return
    const rect = boxRef.current.getBoundingClientRect()
    const dx = (e.clientX - d.x) / rect.width
    const dy = (e.clientY - d.y) / rect.height
    // Drag moves image opposite to show desired part → invert for natural feel (drag image itself)
    setOffsetX(clamp(d.ox - dx * 0.8, -0.5, 0.5))
    setOffsetY(clamp(d.oy - dy * 0.8, -0.5, 0.5))
  }
  const onPointerUp = () => {
    dragRef.current = null
  }

  const aspectStyle = () => {
    if (aspect === 'free') return natural ? { aspectRatio: `${natural.w} / ${natural.h}` } : { aspectRatio: '16 / 9' }
    const found = ASPECTS.find((a) => a.key === aspect)
    return { aspectRatio: aspect.replace('/', ' / ') || `${found?.ratio}` }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[80] p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <ImageIcon size={18} className="text-primary" />
            معاينة وضبط الصورة قبل الرفع
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            اسحب الصورة لتحريكها، واستخدم التكبير ونسبة الأبعاد للتحكم في شكلها النهائي. الصورة ستظهر <b>كاملة بدون قص إجباري</b> في
            الواجهة، وهذا المعاينة هي نفس الناتج الذي سيُرفع.
          </p>

          {/* Main preview */}
          <div
            ref={boxRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            className="relative w-full max-h-[380px] rounded-lg overflow-hidden border border-border bg-black/90 cursor-move touch-none select-none mx-auto"
            style={aspectStyle()}
            title="اسحب لتحريك الصورة"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="معاينة القص" className="w-full h-full object-contain pointer-events-none" draggable={false} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">جاري تجهيز المعاينة...</div>
            )}
            <div className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-1 rounded backdrop-blur">
              {fileName} • اسحب للتحريك
            </div>
          </div>

          {/* Aspect selector */}
          <div>
            <label className="block text-sm font-medium mb-2">نسبة الأبعاد</label>
            <div className="flex flex-wrap gap-2">
              {ASPECTS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setAspect(a.key)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    aspect === a.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:border-primary/50'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom + position */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/30 border border-input rounded-lg p-3">
              <label className="flex items-center gap-1.5 text-xs font-medium mb-2">
                <ZoomIn size={14} /> التكبير: {zoom.toFixed(2)}x
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div className="bg-muted/30 border border-input rounded-lg p-3">
              <label className="flex items-center gap-1.5 text-xs font-medium mb-2">
                <Move size={14} /> أفقي
              </label>
              <input
                type="range"
                min={-0.5}
                max={0.5}
                step={0.01}
                value={offsetX}
                onChange={(e) => setOffsetX(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div className="bg-muted/30 border border-input rounded-lg p-3">
              <label className="flex items-center gap-1.5 text-xs font-medium mb-2">
                <Move size={14} /> عمودي
              </label>
              <input
                type="range"
                min={-0.5}
                max={0.5}
                step={0.01}
                value={offsetY}
                onChange={(e) => setOffsetY(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          {/* Shape previews — how it looks complete */}
          <div>
            <label className="block text-sm font-medium mb-2">هكذا ستظهر الصورة كاملة في المنصة</label>
            <div className="flex items-end gap-4">
              <div className="text-center space-y-1">
                <div className="w-40 aspect-video rounded-lg overflow-hidden border border-border bg-muted/40">
                  {previewUrl && <img src={previewUrl} alt="بطاقة" className="w-full h-full object-contain" />}
                </div>
                <span className="text-[11px] text-muted-foreground">بطاقة مستطيلة</span>
              </div>
              <div className="text-center space-y-1">
                <div className="w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted/40">
                  {previewUrl && <img src={previewUrl} alt="مربع" className="w-full h-full object-contain" />}
                </div>
                <span className="text-[11px] text-muted-foreground">مربع</span>
              </div>
              <div className="text-center space-y-1">
                <div className="w-20 h-20 rounded-full overflow-hidden border border-border bg-muted/40">
                  {previewUrl && <img src={previewUrl} alt="دائري" className="w-full h-full object-contain" />}
                </div>
                <span className="text-[11px] text-muted-foreground">دائري (للمرجع)</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-input rounded-lg px-3 py-2"
              >
                <RotateCcw size={14} /> إعادة ضبط
              </button>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm"
            >
              إلغاء
            </button>
            {onSkipOriginal && (
              <button
                type="button"
                onClick={onSkipOriginal}
                className="px-4 py-2 border border-input rounded-lg hover:border-primary/50 text-sm"
              >
                رفع الأصلية بدون تعديل
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={working || !natural}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={16} />
              {working ? 'جاري التجهيز...' : 'اعتماد ورفع'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
