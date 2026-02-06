import { useCallback } from 'react';
import { differenceInCalendarDays } from 'date-fns';
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
        const s: 0 | 1 | 2 | 3 =
          children.every(c => c.status === 2) ? 2 :
          children.every(c => c.status === 0) ? 0 :
          children.every(c => c.status === 3) ? 3 : 1;

        if (next[i].status !== s) {
          next[i] = { ...next[i], status: s, lastUpdated: Date.now() };
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

  const addTask = useCallback((name: string, offset?: number, parentId?: string) => {
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
      deadlineOffset: offset || undefined,
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

  const updateTaskDeadline = useCallback((id: string, dateStr: string) => {
    if (!data) return;

    let offset: number | undefined;
    if (dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const targetDate = new Date(y, m - 1, d);
      offset = differenceInCalendarDays(targetDate, data.projectStartDate);
    } else {
      offset = undefined;
    }

    const newTasks = data.tasks.map(t =>
      t.id === id ? { ...t, deadlineOffset: offset, lastUpdated: Date.now() } : t
    );
    save(newTasks);
  }, [data, save]);

  const updateProjectStartDate = useCallback((dateStr: string) => {
    if (!dateStr || !data) return;
    
    const [y, m, d] = dateStr.split('-').map(Number);
    const newStartDate = new Date(y, m - 1, d).getTime();

    // 修正箇所: 不要な行を削除しました
    const diffDays = differenceInCalendarDays(newStartDate, data.projectStartDate);

    const newTasks = data.tasks.map(t => {
      if (t.deadlineOffset === undefined) return t;
      return {
        ...t,
        deadlineOffset: t.deadlineOffset - diffDays,
        lastUpdated: Date.now()
      };
    });

    setData({
      ...data,
      projectStartDate: newStartDate,
      tasks: newTasks,
      lastSynced: Date.now()
    });
  }, [data, setData]);

  const optimizeData = useCallback(() => {
    if (!data) return;

    if (!confirm('削除情報のキャッシュをクリアします。\nIDがずれる代わりにデータが最適化されます。')) {
      return;
    }

    const validTasks = data.tasks.filter(t => !t.isDeleted);

    if (validTasks.length === 0) {
      setData({ ...data, tasks: [], lastSynced: Date.now() });
      return;
    }

    const idMap = new Map<string, string>();
    validTasks.forEach((t, index) => {
      idMap.set(t.id, (index + 1).toString(36));
    });

    const optimizedTasks = validTasks.map(t => {
      const newId = idMap.get(t.id)!;
      const newParentId = (t.parentId && idMap.has(t.parentId))
        ? idMap.get(t.parentId)
        : undefined;

      return {
        ...t,
        id: newId,
        parentId: newParentId,
        lastUpdated: Date.now()
      };
    });

    setData({ ...data, tasks: optimizedTasks, lastSynced: Date.now() });
    alert('最適化が完了しました。');
  }, [data, setData]);

  // ドラッグアンドドロップ終了時の処理
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!data) return;
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // ネスト移動判定
    const overIdStr = String(over.id);
    const isNestDrop = overIdStr.startsWith('nest-');
    const targetIdRaw = isNestDrop ? overIdStr.replace('nest-', '') : overIdStr;

    const activeTask = data.tasks.find(t => t.id === active.id);
    const overTask = data.tasks.find(t => t.id === targetIdRaw);

    if (!activeTask || !overTask) return;

    // ネストドロップならターゲット自体が親、そうでなければターゲットの親が親
    const nextParentId = isNestDrop ? overTask.id : overTask.parentId;

    // --- 循環参照防止ロジック ---
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
    // -------------------------

    const newTasks = [...data.tasks];

    // 親IDの更新
    if (activeTask.parentId !== nextParentId) {
      const taskIndex = newTasks.findIndex(t => t.id === active.id);
      newTasks[taskIndex] = { ...newTasks[taskIndex], parentId: nextParentId };
    }

    // 順序の並び替え
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

    // order再割り当て
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
    updateTaskDeadline,
    updateProjectStartDate,
    optimizeData,
    handleDragEnd
  };
};