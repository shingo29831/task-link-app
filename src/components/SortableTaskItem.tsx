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
    // transition, 
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
    // transition: transition, // アニメーション無効化のため削除
    // ドラッグ中のアイテム（リストに残る方）はプレースホルダーとして薄く表示
    opacity: isDragging ? 0.3 : 1, 
    touchAction: 'manipulation', 
    position: 'relative',
    zIndex: isDragging ? 0 : 'auto', // 重なり順を下げる
    backgroundColor: isDragging ? 'rgba(0,0,0,0.1)' : undefined, // 必要に応じて背景調整
    borderRadius: isDragging ? '8px' : undefined,
    // ドラッグ中はボーダーを表示して「ここに入る」感を出しても良い
    border: isDragging ? '1px dashed #666' : 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} data-task-id={id}>
      {children}
    </div>
  );
};