import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  id: string;
  depth?: number;
  disabled?: boolean;
  children: React.ReactNode;
}

// DnDが有効な場合のみマウントされる内部コンポーネント
const SortableInner: React.FC<Omit<Props, 'disabled'>> = ({ id, depth = 0, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ 
    id,
    data: { type: 'task', depth } 
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1, 
    touchAction: 'manipulation', 
    position: 'relative',
    zIndex: isDragging ? 0 : 'auto', 
    backgroundColor: isDragging ? 'var(--bg-item-hover)' : undefined, 
    borderRadius: isDragging ? '8px' : undefined,
    border: isDragging ? '1px dashed var(--text-secondary)' : 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} data-task-id={id}>
      {children}
    </div>
  );
};

// 閲覧者時は SortableContext に依存しないピュアな div を返す
export const SortableTaskItem: React.FC<Props> = ({ id, depth = 0, disabled = false, children }) => {
  if (disabled) {
    return (
      <div data-task-id={id} style={{ position: 'relative' }}>
        {children}
      </div>
    );
  }
  return <SortableInner id={id} depth={depth}>{children}</SortableInner>;
};