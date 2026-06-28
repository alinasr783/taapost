import { lazy, Suspense, createElement, type ComponentType, type LazyExoticComponent } from 'react'
import dynamicIconImports from 'lucide-react/dynamicIconImports'
import { FolderOpen, type LucideProps } from 'lucide-react'

const fallback = <span className="inline-block w-5 h-5" />
const iconCache = new Map<string, LazyExoticComponent<ComponentType<LucideProps>>>()

for (const [key, importFn] of Object.entries(dynamicIconImports)) {
  iconCache.set(key, lazy(importFn as () => Promise<{ default: ComponentType<LucideProps> }>))
}

type Props = {
  name: string
  size?: number
  className?: string
}

export default function DynamicIcon({ name, size = 20, className }: Props) {
  const Icon = iconCache.get(name)
  if (!Icon) return <FolderOpen size={size} className={className} />

  return (
    <Suspense fallback={fallback}>
      {createElement(Icon, { size, className })}
    </Suspense>
  )
}
