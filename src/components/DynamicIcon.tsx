import { lazy, Suspense, type ComponentType } from 'react'
import dynamicIconImports from 'lucide-react/dynamicIconImports'
import { FolderOpen, type LucideProps } from 'lucide-react'

const fallback = <span className="inline-block w-5 h-5" />

const iconCache = new Map<string, ComponentType<LucideProps>>()

type Props = {
  name: string
  size?: number
  className?: string
}

export default function DynamicIcon({ name, size = 20, className }: Props) {
  const importFn = dynamicIconImports[name as keyof typeof dynamicIconImports]
  if (!importFn) return <FolderOpen size={size} className={className} />

  if (!iconCache.has(name)) {
    iconCache.set(name, lazy(importFn))
  }

  const IconComponent = iconCache.get(name)!

  return (
    <Suspense fallback={fallback}>
      <IconComponent size={size} className={className} />
    </Suspense>
  )
}
