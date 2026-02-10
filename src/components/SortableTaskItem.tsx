import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  id: string;
  depth?: number;
  children: React.ReactNode;
}

export const SortableTaskItem: React.FC<Props> = ({ id, depth = 0, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    data: { 
      type: 'task', 
      depth 
    } 
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    // 変更: 'none' から 'manipulation' に変更
    // これにより、ドラッグ開始前（長押し判定待ち）のスワイプ操作が
    // ブラウザのスクロールとして処理されるようになります。
    touchAction: 'manipulation', 
    position: 'relative',
    zIndex: isDragging ? 999 : 'auto', 
    // 視覚フィードバック: ドラッグ中は背景を少し明るく、枠線を強調
    backgroundColor: isDragging ? '#444' : undefined,
    borderRadius: isDragging ? '8px' : undefined,
    boxShadow: isDragging ? '0 0 10px rgba(100, 108, 255, 0.5)' : 'none',
  };

  return (
    // 変更: data-task-id 属性を追加して座標計算に使用できるようにする
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} data-task-id={id}>
      {children}
    </div>
  );
};