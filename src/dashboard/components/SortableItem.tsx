import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

type Props = {
  id: number;
  name: string;
  className?: string;
}

export function SortableItem({ id, name, className }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      className={`bg-card p-3 rounded shadow-sm border border-border flex items-center gap-3 cursor-move touch-none select-none text-card-foreground hover:bg-muted/50 transition-colors ${className || ''}`}
    >
      <GripVertical className="text-muted-foreground flex-shrink-0" />
      <span className="font-medium truncate">{name}</span>
    </div>
  );
}
