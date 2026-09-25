import { useState, type CSSProperties } from 'react'
import { ImageOff } from 'lucide-react'
import { getOptimizedImage, type ImagePreset } from '../utils/supabaseImage'

type Props = {
  src?: string | null
  alt?: string
  className?: string
  imgClassName?: string
  width?: number
  height?: number
  /** Aspect ratio for the wrapper, e.g. '16/9', '1/1'. Prevents layout shift. */
  ratio?: string
  /** Set true for above-the-fold images (logo, hero). Defaults to lazy. */
  eager?: boolean
  objectFit?: CSSProperties['objectFit']
  /** Shown if the image fails to load and no fallbackSrc is provided. */
  fallbackSrc?: string
  /** When true, no placeholder is rendered for a missing/broken image. */
  hideOnError?: boolean
  /** Shared-element name for View Transitions (card image -> hero). */
  transitionName?: string
  /** Supabase transform preset. Defaults to 'card'. */
  preset?: ImagePreset
}

export default function SmartImage({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  width,
  height,
  ratio,
  eager = false,
  objectFit = 'cover',
  fallbackSrc,
  hideOnError = false,
  transitionName,
  preset = 'card',
}: Props) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  const showPlaceholder = !src || (errored && !fallbackSrc)
  const rawSrc = errored && fallbackSrc ? fallbackSrc : src
  const finalSrc = getOptimizedImage(rawSrc, preset)

  const wrapperStyle: CSSProperties = {
    aspectRatio: ratio,
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
  }

  if (showPlaceholder) {
    if (hideOnError) return null
    return (
      <div
        className={`flex items-center justify-center bg-muted/30 text-muted-foreground ${className}`}
        style={wrapperStyle}
        aria-hidden
      >
        <ImageOff className="h-1/3 w-1/3 max-h-10 max-w-10 opacity-50" />
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden bg-muted/30 ${className}`}
      style={wrapperStyle}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted/40" />}
      <img
        src={finalSrc ?? ''}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={`h-full w-full transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${imgClassName}`}
        style={{ objectFit, ...(transitionName ? { viewTransitionName: transitionName } : null) } as CSSProperties}
      />
    </div>
  )
}
