import { useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import type { AppData, Task } from '../types';

/**
 * 親タスクのステータスを子タスクの状態に基づいて再計算するヘルパー関数
 */
const recalculateStatus = (tasks: Task[]): Task[] => {
  const next = [...tasks];
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < next.length; i++) {
      if (next[i].isDeleted) continue;
      const children = next.filter(t => !t.isDeleted && t.parentId === next[i].id);
      
      if (children.length > 0) {
        let newStatus: 0 | 1 | 2 | 3 = 0;

        const allCompleted = children.every(c => c.status === 2);
        const hasSuspended = children.some(c => c.status === 3);
        const hasInProgress = children.some(c => c.status === 1);
        
        const onlySuspendedAndCompleted = children.every(c => c.status === 3 || c.status === 2);

        if (allCompleted) {
            newStatus = 2;
        } else if (hasSuspended && onlySuspendedAndCompleted) {
            newStatus = 3;
        } else if (hasInProgress) {
            newStatus = 1;
        } else {
            newStatus = 0;
        }

        if (next[i].status !== newStatus) {
          next[i] = { ...next[i], status: newStatus, lastUpdated: Date.now() };
          changed = true;
        }
      }
    }
  }
  return next;
};

export const useTaskOperations = (data: AppData | null, setData: (data: AppData) => void) => {
  
  const save = useCallback((newTasks: Task[]) => {
    if (!data) return;
    setData({
      ...data,
      tasks: recalculateStatus(newTasks),
      lastSynced: Date.now()
    });
  }, [data, setData]);

  // 変更: deadlineOffset ではなく absolute timestamp (number) を受け取る
  const addTask = useCallback((name: string, deadline?: number, parentId?: string) => {
    if (!data) return;

    const normalizedName = name;
    
    const isDuplicate = data.tasks.some(t =>
      !t.isDeleted &&
      t.parentId === parentId &&
      t.name === normalizedName
    );

    if (isDuplicate) {
      alert('同じ階層に同名のタスクが既に存在します。');
      return;
    }

    const activeTasks = data.tasks.filter(t => !t.isDeleted);
    const shouldReset = activeTasks.length === 0;

    const newId = shouldReset ? "1" : (data.tasks.length + 1).toString(36);

    const siblings = data.tasks.filter(t => !t.isDeleted && t.parentId === parentId);
    const maxOrder = siblings.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
    const nextOrder = siblings.length === 0 ? 1 : maxOrder + 1;

    const newTask: Task = {
      id: newId,
      name: normalizedName,
      status: 0,
      deadline: deadline, // 絶対値をセット
      lastUpdated: Date.now(),
      parentId: shouldReset ? undefined : parentId,
      order: shouldReset ? 1 : nextOrder
    };

    if (shouldReset) {
      save([newTask]);
    } else {
      save([...data.tasks, newTask]);
    }
  }, [data, save]);

  const deleteTask = useCallback((taskId: string) => {
    if (!data) return;

    const targetTask = data.tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    const message = `タスク：" ${targetTask.name} "を子タスク含め削除します。\n本当に削除しますか？`;
    if (!confirm(message)) return;

    const idsToDelete = new Set<string>();
    const stack = [taskId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      idsToDelete.add(currentId);
      const children = data.tasks.filter(t => !t.isDeleted && t.parentId === currentId);
      children.forEach(c => stack.push(c.id));
    }

    const newTasks = data.tasks.map(t =>
      idsToDelete.has(t.id)
        ? { ...t, isDeleted: true, lastUpdated: Date.now() }
        : t
    );

    save(newTasks);
  }, [data, save]);

  const renameTask = useCallback((id: string, newName: string) => {
    if (!data || !newName.trim()) return;
    
    const targetTask = data.tasks.find(t => t.id === id);
    if (!targetTask) return;

    const isDuplicate = data.tasks.some(t =>
      !t.isDeleted &&
      t.id !== id &&
      t.parentId === targetTask.parentId &&
      t.name === newName
    );

    if (isDuplicate) {
      alert('同じ階層に同名のタスクが既に存在します。');
      return;
    }

    const newTasks = data.tasks.map(t =>
      t.id === id ? { ...t, name: newName, lastUpdated: Date.now() } : t
    );
    save(newTasks);
  }, [data, save]);

  const updateTaskStatus = useCallback((id: string, newStatus: 0 | 1 | 2 | 3) => {
    if (!data) return;
    const newTasks = data.tasks.map(t =>
      t.id === id ? { ...t, status: newStatus, lastUpdated: Date.now() } : t
    );
    save(newTasks);
  }, [data, save]);

  const updateTaskDeadline = useCallback((id: string, dateStr: string) => {
    if (!data) return;

    let newDeadline: number | undefined;
    if (dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      newDeadline = new Date(y, m - 1, d).getTime();
    } else {
      newDeadline = undefined;
    }

    const newTasks = data.tasks.map(t =>
      t.id === id ? { ...t, deadline: newDeadline, lastUpdated: Date.now() } : t
    );
    save(newTasks);
  }, [data, save]);

  // updateProjectStartDate を削除

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!data) return;
    const { active, over } = event;

    if (!over) {
      return;
    }

    if (over.id === 'root-board') {
        const activeIdStr = String(active.id);
        const task = data.tasks.find(t => t.id === activeIdStr);
        if (task && task.parentId !== undefined) {
             const rootTasks = data.tasks.filter(t => !t.isDeleted && !t.parentId);
             const maxOrder = rootTasks.reduce((max, t) => Math.max(max, t.order ?? 0), 0);

             const newTasks = data.tasks.map(t => 
                t.id === activeIdStr 
                ? { ...t, parentId: undefined, order: maxOrder + 1, lastUpdated: Date.now() }
                : t
             );
             save(newTasks);
        }
        return;
    }

    if (active.id === over.id) {
      return;
    }

    const overIdStr = String(over.id);
    const isNestDrop = overIdStr.startsWith('nest-');
    const targetIdRaw = isNestDrop ? overIdStr.replace('nest-', '') : overIdStr;

    const activeTask = data.tasks.find(t => t.id === active.id);
    const overTask = data.tasks.find(t => t.id === targetIdRaw);

    if (!activeTask || !overTask) return;

    const nextParentId = isNestDrop ? overTask.id : overTask.parentId;

    if (nextParentId === activeTask.id) {
      return;
    }

    let currentCheckId = nextParentId;
    let isCircular = false;
    while (currentCheckId) {
      if (currentCheckId === activeTask.id) {
        isCircular = true;
        break;
      }
      const parentTask = data.tasks.find(t => t.id === currentCheckId);
      currentCheckId = parentTask?.parentId;
    }

    if (isCircular) {
      return;
    }

    const newTasks = [...data.tasks];

    if (activeTask.parentId !== nextParentId) {
      const taskIndex = newTasks.findIndex(t => t.id === active.id);
      newTasks[taskIndex] = { ...newTasks[taskIndex], parentId: nextParentId };
    }

    const siblings = newTasks
      .filter(t => !t.isDeleted && t.parentId === nextParentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (!isNestDrop) {
      const oldIndex = siblings.findIndex(t => t.id === active.id);
      const newIndex = siblings.findIndex(t => t.id === targetIdRaw);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedSiblings = arrayMove(siblings, oldIndex, newIndex);
        reorderedSiblings.forEach((t, idx) => {
           const globalIdx = newTasks.findIndex(nt => nt.id === t.id);
           if (globalIdx > -1) {
             newTasks[globalIdx] = { ...newTasks[globalIdx], order: idx + 1 };
           }
        });
        save(newTasks);
        return;
      }
    }

    siblings.forEach((t, index) => {
      const globalIndex = newTasks.findIndex(nt => nt.id === t.id);
      if (globalIndex !== -1) {
        newTasks[globalIndex] = { ...newTasks[globalIndex], order: index + 1, lastUpdated: Date.now() };
      }
    });

    save(newTasks);
  }, [data, save]);

  return {
    addTask,
    deleteTask,
    renameTask,
    updateTaskStatus,
    updateTaskDeadline,
    handleDragEnd
  };
};