import { useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, ArrowLeft, ArrowRight } from 'lucide-react'
import type { Article } from '../../lib/supabase'
import PostPicker from './PostPicker'

type Props = {
  categoryId: number
  selectedArticles: Article[]
  onChange: (articles: Article[]) => void
  maxCount?: number
}

function SortablePostItem({ article, onRemove, index }: { article: Article; onRemove: () => void; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: article.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-2 bg-card border border-border rounded-lg transition-colors ${
        isDragging ? 'shadow-lg z-50 opacity-80' : 'hover:bg-muted/50'
      }`}
    >
      <div {...attributes} {...listeners} className="p-1 cursor-grab hover:text-primary text-muted-foreground shrink-0">
        <GripVertical size={16} />
      </div>
      <span className="text-xs text-muted-foreground w-5 text-center shrink-0">{index + 1}</span>
      <div className="w-10 h-8 rounded overflow-hidden bg-muted shrink-0">
        {article.image ? (
          <img src={article.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">صورة</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{article.title}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-destructive hover:bg-destructive/10 rounded shrink-0"
        title="إزالة"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function SliderPostManager({ categoryId, selectedArticles, onChange, maxCount = 10 }: Props) {
  const [showPicker, setShowPicker] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = selectedArticles.findIndex(a => a.id === active.id)
    const newIndex = selectedArticles.findIndex(a => a.id === over.id)
    onChange(arrayMove([...selectedArticles], oldIndex, newIndex))
  }

  const handleRemove = (id: number) => {
    onChange(selectedArticles.filter(a => a.id !== id))
  }

  const handlePickerSelect = (articles: Article[]) => {
    onChange(articles)
    setShowPicker(false)
  }

  return (
    <div className="space-y-3">
      {selectedArticles.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={selectedArticles.map(a => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {selectedArticles.map((article, index) => (
                <SortablePostItem
                  key={article.id}
                  article={article}
                  index={index}
                  onRemove={() => handleRemove(article.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {selectedArticles.length < maxCount && (
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="w-full py-2 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} className={`transition-transform ${showPicker ? 'rotate-90' : ''}`} />
          {selectedArticles.length === 0 ? 'اختر المقالات' : 'إضافة مقالات'}
        </button>
      )}

      {showPicker && (
        <div className="border border-border rounded-lg p-3 bg-muted/20">
          <PostPicker
            categoryId={categoryId}
            selectedIds={selectedArticles.map(a => a.id)}
            onSelect={handlePickerSelect}
            maxCount={maxCount}
          />
        </div>
      )}
    </div>
  )
}
