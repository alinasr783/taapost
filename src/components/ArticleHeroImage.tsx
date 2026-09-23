import { useState } from 'react'
import { ImageOff } from 'lucide-react'

type Props = {
  src?: string | null
  alt?: string
  caption?: string | null
  roundedClass?: string
  maxHeightClass?: string
  eager?: boolean
}

/**
 * عرض عصري للصورة الرئيسية داخل صفحة المقال/البوست:
 * - الصورة تظهر كاملة دائماً (object-contain) بدون أي قص
 * - العرض 100% والطول حر حسب أبعاد الصورة الأصلية (مكبّل بسقف لمنع الصفحات الطويلة جداً)
 * - خلفية ضبابية من نفس الصورة تملأ الفراغ بشكل أنيق
 * - يعمل مع المربعة / المستطيلة / الطولية / الشفافة
 */
export default function ArticleHeroImage({
  src,
  alt = '',
  caption,
  roundedClass = 'rounded-[5px]',
  maxHeightClass = 'max-h-[75vh]',
  eager = true,
}: Props) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/30 text-muted-foreground ${roundedClass} min-h-[200px]`}
        aria-hidden
      >
        <ImageOff className="h-10 w-10 opacity-50" />
      </div>
    )
  }

  return (
    <figure className={`overflow-hidden shadow-lg ${roundedClass} bg-muted/30`}>
      <div className="relative w-full overflow-hidden">
        {/* طبقة الخلفية الضبابية — تملأ أي فراغ حول الصورة */}
        <img
          src={src}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-40 select-none"
        />
        {/* الصورة الأصلية كاملة بدون قص */}
        {!loaded && <div className="absolute inset-0 animate-pulse bg-muted/40" />}
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`relative z-10 mx-auto w-full h-auto ${maxHeightClass} object-contain transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
      {caption && (
        <figcaption className="text-sm text-center text-muted-foreground py-2 px-4 bg-muted/30">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
