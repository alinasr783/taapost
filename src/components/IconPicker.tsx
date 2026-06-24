import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import dynamicIconImports from 'lucide-react/dynamicIconImports'
import DynamicIcon from './DynamicIcon'

const iconNames = Object.keys(dynamicIconImports).sort()

const popularIcons = [
  'home', 'file-text', 'folder-open', 'layout-grid', 'cpu', 'languages',
  'landmark', 'bar-chart-3', 'book-open', 'heart', 'trophy', 'flask-conical',
  'palette', 'trending-up', 'briefcase', 'globe', 'newspaper', 'camera',
  'music', 'video', 'message-square', 'users', 'pen-tool', 'settings',
  'star', 'zap', 'shield', 'award', 'graduation-cap', 'plane',
  'leaf', 'utensils', 'shopping-bag', 'building-2', 'map-pin', 'phone',
  'mail', 'calendar', 'clock', 'tag', 'hash', 'link',
  'image', 'play', 'mic', 'compass', 'sun', 'moon',
  'cloud', 'database', 'code', 'terminal', 'server', 'wifi',
  'smartphone', 'tablet', 'monitor', 'printer', 'keyboard', 'mouse-pointer',
  'hard-drive', 'usb', 'headphones', 'speaker', 'tv', 'radio',
  'rocket', 'target', 'crosshair', 'flag', 'bookmark', 'thumbs-up',
  'share-2', 'download', 'upload', 'refresh-cw', 'rotate-cw', 'repeat',
  'play-circle', 'pause-circle', 'stop-circle', 'skip-forward', 'skip-back',
  'volume-2', 'volume-x', 'mic-off', 'video-off', 'eye', 'eye-off',
  'lock', 'unlock', 'key', 'copy', 'clipboard', 'scissors',
  'pencil', 'eraser', 'sticky-note', 'paperclip', 'archive', 'trash-2',
]

type Props = {
  value: string
  onChange: (iconName: string) => void
}

export default function IconPicker({ value, onChange }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return popularIcons
    const q = search.toLowerCase()
    return iconNames.filter(name => name.includes(q)).slice(0, 200)
  }, [search])

  return (
    <div>
      <div className="relative mb-2">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن أيقونة..."
          className="w-full pl-3 pr-9 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-ring outline-none"
        />
      </div>
      <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 max-h-56 overflow-y-auto p-1 border border-border rounded-md bg-muted/20">
        {filtered.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={`p-2 rounded-md flex items-center justify-center transition-colors ${
              value === name ? 'bg-primary text-primary-foreground ring-2 ring-ring' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
            title={name}
          >
            <DynamicIcon name={name} size={20} />
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-4 text-center text-sm text-muted-foreground">
            لا توجد نتائج
          </div>
        )}
      </div>
    </div>
  )
}
