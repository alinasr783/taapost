import type { Area } from 'react-easy-crop'

/** إنشاء عنصر صورة من مصدر (URL أو DataURL) */
function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * قص الصورة في المتصفح عبر Canvas حسب منطقة البكسل من react-easy-crop.
 * يحافظ على الجودة الأصلية (JPEG بجودة 0.92) ويعيد Blob + DataURL للمعاينة.
 */
export async function getCroppedImage(
  src: string,
  pixelCrop: Area,
): Promise<{ blob: Blob; dataUrl: string }> {
  const image = await createImage(src)
  const canvas = document.createElement('canvas')
  const w = Math.max(1, Math.round(pixelCrop.width))
  const h = Math.max(1, Math.round(pixelCrop.height))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('تعذر إنشاء سياق الرسم')

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    w,
    h,
  )

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('تعذر إنشاء ملف الصورة'))),
      'image/jpeg',
      0.92,
    )
  })
  return { blob, dataUrl }
}

/** قراءة أبعاد أي صورة (لل عرض W×H في لوحة التحكم) */
export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return createImage(src).then((img) => ({ width: img.naturalWidth, height: img.naturalHeight }))
}
