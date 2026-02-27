import { useCallback } from 'react';
import { 
  KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, 
  pointerWithin, type DragEndEvent, type CollisionDetection 
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import type { Task, AppData } from '../types';

export const useTaskDnD = (data: AppData | null, save: (newTasks: Task[]) => void) => {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const { droppableContainers } = args;
    const pointerCollisions = pointerWithin(args);
    const hitSortable = pointerCollisions.find(c => !String(c.id).startsWith('nest-') && c.id !== 'root-board');
    const hitNest = pointerCollisions.find(c => String(c.id).startsWith('nest-'));

    if (hitSortable || hitNest) {
        const targetId = hitSortable?.id || (hitNest ? String(hitNest.id).replace('nest-', '') : null);
        if (targetId) {
            const nestContainer = droppableContainers.find(c => c.id === `nest-${targetId}`);
            if (nestContainer) return [{ id: nestContainer.id, data: nestContainer.data }];
        }
    }

    const boardCollision = pointerCollisions.find(c => c.id === 'root-board');
    if (boardCollision) return [boardCollision];

    return [];
  }, []);

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
            const dropCenterX = activeRect.left + activeRect.width / 2;
            let insertIndex = rootTasks.length; 

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

            const newRootIds = rootTasks.map(t => t.id);
            newRootIds.splice(insertIndex, 0, activeTask.id);

            const newTasks = data.tasks.map(t => {
                const rootIdx = newRootIds.indexOf(t.id);
                if (rootIdx !== -1) {
                    return { ...t, parentId: undefined, order: rootIdx + 1, lastUpdated: Date.now() };
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
    if (activeTask.parentId !== nextParentId) {
      const taskIndex = newTasks.findIndex(t => t.id === active.id);
      newTasks[taskIndex] = { ...newTasks[taskIndex], parentId: nextParentId };
    }
    const siblings = newTasks.filter(t => !t.isDeleted && t.parentId === nextParentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    if (!isNestDrop) {
      const oldIndex = siblings.findIndex(t => t.id === active.id);
      const newIndex = siblings.findIndex(t => t.id === targetIdRaw);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedSiblings = arrayMove(siblings, oldIndex, newIndex);
        reorderedSiblings.forEach((t, idx) => {
           const globalIdx = newTasks.findIndex(nt => nt.id === t.id);
           if (globalIdx > -1) { newTasks[globalIdx] = { ...newTasks[globalIdx], order: idx + 1 }; }
        });
        save(newTasks);
        return;
      }
    }
    
    siblings.forEach((t, index) => {
      const globalIndex = newTasks.findIndex(nt => nt.id === t.id);
      if (globalIndex !== -1) { newTasks[globalIndex] = { ...newTasks[globalIndex], order: index + 1, lastUpdated: Date.now() }; }
    });
    save(newTasks);
  }, [data, save]);

  return { sensors, customCollisionDetection, handleDragEnd };
};