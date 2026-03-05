// 役割: タスクデータのCRUD（作成、更新、削除）操作を管理する
// なぜ: タスク操作のロジックが複雑化しており、UI状態やプロジェクト管理から分離するため

import { useCallback } from 'react';
import type { Task, AppData } from '../types';
import { recalculateStatus } from '../utils/taskUtils';

export const useTaskMutations = (
  data: AppData | null, 
  setData: (data: AppData) => void,
  projectsRef: React.MutableRefObject<AppData[]>,
  activeId: string,
  updateProject: (p: AppData) => void,
  activeTasks: Task[],
  menuOpenTaskId: string | null,
  setMenuOpenTaskId: React.Dispatch<React.SetStateAction<string | null>>
) => {

  const save = useCallback((newTasks: Task[]) => {
    if (!data) return;
    setData({
      ...data,
      tasks: recalculateStatus(newTasks),
      lastSynced: Date.now()
    });
  }, [data, setData]);

  const applyCloudSyncForStatusChange = useCallback((targetProjId: string, applyChanges: (tasks: Task[]) => Task[]) => {
      const currentProjects = projectsRef.current;
      const targetProject = currentProjects.find((p: AppData) => p.id === targetProjId);
      if (!targetProject) return;

      const updatedTasks = applyChanges(targetProject.tasks || []);
      const calculatedTasks = recalculateStatus(updatedTasks);
      const now = Date.now();

      const newProjectData = { ...targetProject, tasks: calculatedTasks, lastSynced: now };
      
      if (targetProjId === activeId && data) {
          setData(newProjectData);
      } else {
          updateProject(newProjectData);
      }
  }, [activeId, data, setData, updateProject, projectsRef]);

  const updateParentStatus = useCallback((id: string, newStatus: 0 | 1 | 2 | 3) => {
    let targetProjId = data?.id;
    let realTaskId = id;

    if (id.includes('_')) {
        const [projId, parsedTaskId] = id.split('_');
        const isCurrent = (data?.tasks || []).some((t: Task) => t.id === id);
        if (!isCurrent) {
            targetProjId = projId;
            realTaskId = parsedTaskId;
        }
    }
    if (!targetProjId) return;

    applyCloudSyncForStatusChange(targetProjId, (tasks) => {
        let nextTasks = [...tasks];
        const now = Date.now();
        if (newStatus === 2) { 
          nextTasks = nextTasks.map((t: Task) => (t.parentId === realTaskId && !t.isDeleted) ? { ...t, status: 2, lastUpdated: now } : t);
        } else if (newStatus === 0) { 
          nextTasks = nextTasks.map((t: Task) => (t.parentId === realTaskId && !t.isDeleted && t.status !== 2) ? { ...t, status: 0, lastUpdated: now } : t);
        } else if (newStatus === 1) { 
          nextTasks = nextTasks.map((t: Task) => (t.parentId === realTaskId && !t.isDeleted && t.status !== 2) ? { ...t, status: 1, lastUpdated: now } : t);
        }
        return nextTasks.map((t: Task) => t.id === realTaskId ? { ...t, status: newStatus, lastUpdated: now } : t);
    });
  }, [data, applyCloudSyncForStatusChange]);

  const updateTaskStatus = useCallback((id: string, newStatus: 0 | 1 | 2 | 3) => {
    let targetProjId = data?.id;
    let realTaskId = id;

    if (id.includes('_')) {
        const [projId, parsedTaskId] = id.split('_');
        const isCurrent = (data?.tasks || []).some((t: Task) => t.id === id);
        if (!isCurrent) {
            targetProjId = projId;
            realTaskId = parsedTaskId;
        }
    }
    if (!targetProjId) return;

    applyCloudSyncForStatusChange(targetProjId, (tasks) => {
        return tasks.map((t: Task) => t.id === realTaskId ? { ...t, status: newStatus, lastUpdated: Date.now() } : t);
    });
  }, [data, applyCloudSyncForStatusChange]);

  const deleteTask = useCallback((taskId: string) => {
    if (!data) return;
    const targetTask = (data.tasks || []).find((t: Task) => t.id === taskId);
    if (!targetTask) return;
    const message = `タスク：" ${targetTask.name} "を子タスク含め削除します。\n本当に削除しますか？`;
    if (!confirm(message)) return;
    const idsToDelete = new Set<string>();
    const stack = [taskId];
    while (stack.length > 0) {
      const currentId = stack.pop()!;
      idsToDelete.add(currentId);
      const children = (data.tasks || []).filter((t: Task) => !t.isDeleted && t.parentId === currentId);
      children.forEach((c: Task) => stack.push(c.id));
    }
    const newTasks = (data.tasks || []).map((t: Task) => idsToDelete.has(t.id) ? { ...t, isDeleted: true, lastUpdated: Date.now() } : t);
    save(newTasks);
    if (menuOpenTaskId === taskId) setMenuOpenTaskId(null);
  }, [data, save, menuOpenTaskId, setMenuOpenTaskId]);

  const renameTask = useCallback((id: string, newName: string) => {
    if (!data || !newName.trim()) return;
    const targetTask = (data.tasks || []).find((t: Task) => t.id === id);
    if (!targetTask) return;
    const isDuplicate = (data.tasks || []).some((t: Task) => !t.isDeleted && t.id !== id && t.parentId === targetTask.parentId && t.name === newName);
    if (isDuplicate) { alert('同じ階層に同名のタスクが既に存在します。'); return; }
    const newTasks = (data.tasks || []).map((t: Task) => t.id === id ? { ...t, name: newName, lastUpdated: Date.now() } : t);
    save(newTasks);
  }, [data, save]);

  const updateTaskDeadline = useCallback((id: string, dateStr: string) => {
    if (!data) return;
    let newDeadline: number | undefined;
    if (dateStr) { const [y, m, d] = dateStr.split('-').map(Number); newDeadline = new Date(y, m - 1, d).getTime(); } 
    else { newDeadline = undefined; }
    const newTasks = (data.tasks || []).map((t: Task) => t.id === id ? { ...t, deadline: newDeadline, lastUpdated: Date.now() } : t);
    save(newTasks);
  }, [data, save]);

  const handleAddTaskWrapper = useCallback((taskName: string, dateStr: string, activeParentId: string | null, targetParentId?: string) => {
    if (!taskName.trim() || !data) return;
    let deadline: number | undefined;
    if (dateStr) { const [y, m, d] = dateStr.split('-').map(Number); deadline = new Date(y, m - 1, d).getTime(); }
    
    let targetId = targetParentId ?? activeParentId ?? undefined;
    if (targetId) {
        const parentExists = (data.tasks || []).some((t: Task) => t.id === targetId && !t.isDeleted);
        if (!parentExists) targetId = undefined;
    }
    
    const isDuplicate = (data.tasks || []).some((t: Task) => !t.isDeleted && t.parentId === targetId && t.name === taskName);
    if (isDuplicate) { alert('同じ階層に同名のタスクが既に存在します。'); return; }
    
    const existingIds = new Set((data.tasks || []).map((t: Task) => t.id));
    let candidateNum = activeTasks.length === 0 ? 1 : (data.tasks || []).length + 1;
    let newId = candidateNum.toString(36);
    while (existingIds.has(newId)) { candidateNum++; newId = candidateNum.toString(36); }
    
    const siblings = (data.tasks || []).filter((t: Task) => !t.isDeleted && t.parentId === targetId);
    const maxOrder = siblings.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
    const nextOrder = siblings.length === 0 ? 1 : maxOrder + 1;
    const newTask: Task = {
        id: newId, name: taskName, status: 0, deadline: deadline, lastUpdated: Date.now(),
        parentId: activeTasks.length === 0 ? undefined : targetId, order: activeTasks.length === 0 ? 1 : nextOrder
    };
    save([...(data.tasks || []), newTask]);
  }, [data, activeTasks, save]);

  const moveTaskOrder = useCallback((taskId: string, direction: 'up' | 'down') => {
    if (!data || !data.tasks) return;
    const taskIndex = data.tasks.findIndex((t: Task) => t.id === taskId);
    if (taskIndex === -1) return;
    
    const taskToMove = data.tasks[taskIndex];
    const siblings = data.tasks
      .filter((t: Task) => t.parentId === taskToMove.parentId && !t.isDeleted)
      .sort((a: Task, b: Task) => (a.order ?? 0) - (b.order ?? 0));
      
    const siblingIndex = siblings.findIndex((t: Task) => t.id === taskId);
    if (direction === 'up' && siblingIndex > 0) {
      const target = siblings[siblingIndex - 1];
      const newTasks = [...data.tasks];
      const tIndex = newTasks.findIndex((t: Task) => t.id === taskToMove.id);
      const targetIndex = newTasks.findIndex((t: Task) => t.id === target.id);
      const temp = newTasks[tIndex].order;
      newTasks[tIndex] = { ...newTasks[tIndex], order: newTasks[targetIndex].order };
      newTasks[targetIndex] = { ...newTasks[targetIndex], order: temp };
      save(newTasks);
    } else if (direction === 'down' && siblingIndex < siblings.length - 1) {
      const target = siblings[siblingIndex + 1];
      const newTasks = [...data.tasks];
      const tIndex = newTasks.findIndex((t: Task) => t.id === taskToMove.id);
      const targetIndex = newTasks.findIndex((t: Task) => t.id === target.id);
      const temp = newTasks[tIndex].order;
      newTasks[tIndex] = { ...newTasks[tIndex], order: newTasks[targetIndex].order };
      newTasks[targetIndex] = { ...newTasks[targetIndex], order: temp };
      save(newTasks);
    }
  }, [data, save]);

  // 開閉状態のトグル（JSONデータに直接書き込む）
  const toggleTaskExpand = useCallback((taskId: string) => {
    if (!data) return;
    const newTasks = (data.tasks || []).map((t: Task) => {
      if (t.id === taskId) {
        return {
          ...t,
          // undefined (デフォルト展開) または true なら false にする
          isExpanded: t.isExpanded === false ? true : false,
          lastUpdated: Date.now()
        };
      }
      return t;
    });
    save(newTasks);
  }, [data, save]);

  return { save, updateParentStatus, updateTaskStatus, deleteTask, renameTask, updateTaskDeadline, handleAddTaskWrapper, moveTaskOrder, toggleTaskExpand };
};