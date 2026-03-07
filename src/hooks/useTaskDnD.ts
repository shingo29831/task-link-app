// src/hooks/useTaskDnD.ts
/**
 * @fileoverview タスクのドラッグ&ドロップ(DnD)に関する処理を提供するカスタムフック。
 * センサーの設定、衝突判定のカスタマイズ、ドラッグ終了時の並び替え・親子関係の更新ロジックを管理する。
 */
import { useCallback } from 'react';
import { 
  KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, 
  pointerWithin, type DragEndEvent, type CollisionDetection 
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Task, AppData } from '../types';

export const useTaskDnD = (data: AppData | null, save: (newTasks: Task[]) => void, boardLayout: 'horizontal' | 'vertical' = 'horizontal') => {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const { droppableContainers, active, pointerCoordinates } = args;
    const pointerCollisions = pointerWithin(args);
    const hitSortable = pointerCollisions.find(c => !String(c.id).startsWith('nest-') && c.id !== 'root-board');
    const hitNest = pointerCollisions.find(c => String(c.id).startsWith('nest-'));

    if (hitSortable || hitNest) {
        const targetId = hitSortable?.id || (hitNest ? String(hitNest.id).replace('nest-', '') : null);
        if (targetId) {
            // 自身をフォーカス可能にするため、対象がドラッグ中のタスク自身であればそのまま自身のコンテナを返す
            if (targetId === active.id) {
                const selfContainer = droppableContainers.find(c => c.id === active.id);
                if (selfContainer) return [{ id: selfContainer.id, data: selfContainer.data }];
            }

            if (pointerCoordinates) {
                const targetTask = data?.tasks.find(t => t.id === targetId);
                const isRootTask = targetTask && !targetTask.parentId;

                // rootTask以外の場合、縦1/5の上下領域はネストではなく並び替えとして扱う
                if (!isRootTask) {
                    const targetElement = document.querySelector(`[data-task-id="${targetId}"]`);
                    if (targetElement) {
                        const rect = targetElement.getBoundingClientRect();
                        const y = pointerCoordinates.y - rect.top;
                        const ratio = y / rect.height;

                        if (ratio < 0.2 || ratio > 0.8) {
                            const sortableContainer = droppableContainers.find(c => c.id === targetId);
                            if (sortableContainer) return [{ id: sortableContainer.id, data: sortableContainer.data }];
                        }
                    }
                }
            }

            const nestContainer = droppableContainers.find(c => c.id === `nest-${targetId}`);
            if (nestContainer) return [{ id: nestContainer.id, data: nestContainer.data }];
        }
    }

    const boardCollision = pointerCollisions.find(c => c.id === 'root-board');
    if (boardCollision) return [boardCollision];

    return [];
  }, [data]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!data) return;
    const { active, over } = event;
    if (!over) return;

    if (over.id === 'root-board') {
        const activeIdStr = String(active.id);
        const activeTask = data.tasks.find(t => t.id === activeIdStr);
        if (!activeTask) return;

        const rootTasks = data.tasks
            .filter(t => !t.isDeleted && !t.parentId && t.id !== activeIdStr)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const activeRect = active.rect.current.translated;
        if (activeRect) {
            let insertIndex = rootTasks.length; 

            // なぜ: 設定されたレイアウトに応じて、挿入位置の計算に使う軸(X軸/Y軸)を切り替えるため
            if (boardLayout === 'vertical') {
                const dropCenterY = activeRect.top + activeRect.height / 2;
                for (let i = 0; i < rootTasks.length; i++) {
                    const task = rootTasks[i];
                    const el = document.querySelector(`[data-task-id="${task.id}"]`);
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        const centerY = rect.top + rect.height / 2;
                        if (dropCenterY < centerY) {
                            insertIndex = i;
                            break;
                        }
                    }
                }
            } else {
                const dropCenterX = activeRect.left + activeRect.width / 2;
                for (let i = 0; i < rootTasks.length; i++) {
                    const task = rootTasks[i];
                    const el = document.querySelector(`[data-task-id="${task.id}"]`);
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        if (dropCenterX < centerX) {
                            insertIndex = i;
                            break;
                        }
                    }
                }
            }

            const newRootIds = rootTasks.map(t => t.id);
            newRootIds.splice(insertIndex, 0, activeTask.id);

            const newTasks = data.tasks.map(t => {
                const rootIdx = newRootIds.indexOf(t.id);
                if (rootIdx !== -1) {
                    const newOrder = rootIdx + 1;
                    const isChanged = t.parentId !== undefined || t.order !== newOrder;
                    return { ...t, parentId: undefined, order: newOrder, lastUpdated: isChanged ? Date.now() : t.lastUpdated };
                }
                return t;
            });
            save(newTasks);
            return;
        }

        const maxOrder = rootTasks.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
        const newTasks = data.tasks.map(t => 
             t.id === activeIdStr ? { ...t, parentId: undefined, order: maxOrder + 1, lastUpdated: Date.now() } : t
        );
        save(newTasks);
        return;
    }

    if (active.id === over.id) return;
    const overIdStr = String(over.id);
    const isNestDrop = overIdStr.startsWith('nest-');
    const targetIdRaw = isNestDrop ? overIdStr.replace('nest-', '') : overIdStr;
    const activeTask = data.tasks.find(t => t.id === active.id);
    const overTask = data.tasks.find(t => t.id === targetIdRaw);
    if (!activeTask || !overTask) return;
    const nextParentId = isNestDrop ? overTask.id : overTask.parentId;
    if (nextParentId === activeTask.id) return;
    
    let currentCheckId = nextParentId;
    let isCircular = false;
    while (currentCheckId) {
      if (currentCheckId === activeTask.id) { isCircular = true; break; }
      const parentTask = data.tasks.find(t => t.id === currentCheckId);
      currentCheckId = parentTask?.parentId;
    }
    if (isCircular) return;
    
    const newTasks = [...data.tasks];
    
    const siblings = newTasks
      .filter(t => !t.isDeleted && t.parentId === nextParentId && t.id !== active.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    if (!isNestDrop) {
      let insertIndex = siblings.findIndex(t => t.id === targetIdRaw);
      if (insertIndex === -1) insertIndex = siblings.length;
      
      const targetElement = document.querySelector(`[data-task-id="${targetIdRaw}"]`);
      const activeRect = active.rect.current.translated;
      if (targetElement && activeRect) {
          const rect = targetElement.getBoundingClientRect();
          const activeCenterY = activeRect.top + activeRect.height / 2;
          const targetCenterY = rect.top + rect.height / 2;
          if (activeCenterY > targetCenterY) {
              insertIndex += 1;
          }
      }
      
      siblings.splice(insertIndex, 0, { ...activeTask, parentId: nextParentId });
    } else {
      siblings.push({ ...activeTask, parentId: nextParentId });
    }
    
    siblings.forEach((t, index) => {
      const globalIndex = newTasks.findIndex(nt => nt.id === t.id);
      if (globalIndex !== -1) {
        const newOrder = index + 1;
        const newParentId = t.id === active.id ? nextParentId : newTasks[globalIndex].parentId;
        const isChanged = newTasks[globalIndex].order !== newOrder || newTasks[globalIndex].parentId !== newParentId;

        newTasks[globalIndex] = { 
            ...newTasks[globalIndex], 
            parentId: newParentId, 
            order: newOrder, 
            lastUpdated: isChanged ? Date.now() : newTasks[globalIndex].lastUpdated 
        };
      }
    });
    
    save(newTasks);
  }, [data, save, boardLayout]);

  return { sensors, customCollisionDetection, handleDragEnd };
};