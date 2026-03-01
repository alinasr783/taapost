import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';

type Props = {
  id: number;
  children: ReactNode;
  className?: string;
}

export function SortableItem({ id, children, className }: Props) {
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
      className={`bg-card rounded shadow-sm border border-border flex items-center gap-3 touch-none select-none text-card-foreground hover:bg-muted/50 transition-colors ${className || ''}`}
    >
      <div {...attributes} {...listeners} className="p-3 cursor-grab hover:text-primary transition-colors text-muted-foreground">
        <GripVertical size={20} />
      </div>
      <div className="flex-1 p-2">
        {children}
      </div>
    </div>
  );
}
