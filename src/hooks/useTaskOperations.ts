import { useState, useMemo, useCallback, useEffect } from 'react';
import { KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, pointerWithin, type DragEndEvent, type CollisionDetection } from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import type { Task } from '../types'; 
import { useAppData } from './useAppData';
import { getIntermediateJson, from185, decompressData } from '../utils/compression';
import { MAPPING_GROUPS_V0 as MAPPING_GROUPS } from '../utils/versions/v0';

type TaskNode = Task & { children: TaskNode[] };

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

        if (allCompleted) newStatus = 2;
        else if (hasSuspended && onlySuspendedAndCompleted) newStatus = 3;
        else if (hasInProgress) newStatus = 1;

        if (next[i].status !== newStatus) {
          next[i] = { ...next[i], status: newStatus, lastUpdated: Date.now() };
          changed = true;
        }
      }
    }
  }
  return next;
};

export const useTaskOperations = () => {
  const { 
    data, setData, updateProject, incomingData, setIncomingData, getShareUrl,
    projects, activeId, addProject, importNewProject, switchProject, deleteProject,
    undo, redo, canUndo, canRedo,
    uploadProject, syncLimitState, resolveSyncLimit, currentLimit,
    syncState // ★ 追加
  } = useAppData();

  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showAllProjectsInCalendar, setShowAllProjectsInCalendar] = useState(false);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [inputTaskName, setInputTaskName] = useState('');
  const [inputDateStr, setInputDateStr] = useState('');
  const [menuOpenTaskId, setMenuOpenTaskId] = useState<string | null>(null);

  const activeTasks = useMemo(() => { return data ? data.tasks.filter(t => !t.isDeleted) : []; }, [data]);

  const calendarTasks = useMemo(() => {
    if (!data) return [];
    if (!showAllProjectsInCalendar) {
      return activeTasks.map(t => ({ ...t, hasChildren: activeTasks.some(child => !child.isDeleted && child.parentId === t.id) }));
    }
    const allTasks: Task[] = [];
    projects.forEach(proj => {
      const projTasks = proj.tasks.filter(t => !t.isDeleted);
      const isCurrentProject = proj.id === data.id;
      const safeTasks = projTasks.map(t => ({
          ...t,
          id: isCurrentProject ? t.id : `${proj.id}_${t.id}`,
          sourceProjectName: isCurrentProject ? undefined : proj.projectName,
          sourceProjectId: isCurrentProject ? undefined : proj.id,
          hasChildren: projTasks.some(child => !child.isDeleted && child.parentId === t.id)
      }));
      allTasks.push(...safeTasks);
    });
    return allTasks;
  }, [data, projects, activeTasks, showAllProjectsInCalendar]);

  const activeParent = useMemo(() => { return (data && activeParentId) ? data.tasks.find(t => t.id === activeParentId) || null : null; }, [data, activeParentId]);

  const rootNodes = useMemo(() => {
    if (!data) return [];
    const buildTree = (tasks: Task[]): TaskNode[] => {
      const map = new Map<string, TaskNode>();
      tasks.filter(t => !t.isDeleted).forEach(t => map.set(t.id, { ...t, children: [] }));
      const roots: TaskNode[] = [];
      tasks.filter(t => !t.isDeleted).forEach(t => {
        const node = map.get(t.id)!;
        if (t.parentId && map.has(t.parentId)) map.get(t.parentId)!.children.push(node);
        else roots.push(node);
      });
      const sortFn = (a: TaskNode, b: TaskNode) => (a.order ?? 0) - (b.order ?? 0);
      map.forEach(node => node.children.sort(sortFn));
      roots.sort(sortFn);
      return roots;
    };
    return buildTree(data.tasks);
  }, [data]);

  const targetLocalData = useMemo(() => {
    if (!incomingData || !projects || !data) return null;
    const sameNameProject = projects.find(p => p.projectName === incomingData.projectName);
    if (sameNameProject) return sameNameProject;
    const sameIdProject = projects.find(p => p.id === incomingData.id);
    if (sameIdProject) return sameIdProject;
    return data;
  }, [incomingData, projects, data]);

  const debugInfo = useMemo(() => {
    if (!data) return { normal: "", intermediate: "", compressed: "", normalLen: 0, intermediateLen: 0, compressedLen: 0, rate: 0, mappingInfo: "" };
    const normal = JSON.stringify(data);
    const intermediate = getIntermediateJson(data);
    let mappingInfo = "Unknown";
    try {
      const headerPart = intermediate.split('[')[0]; 
      const parts = headerPart.split(',');
      if (parts.length >= 2) {
        const ver = from185(parts[0]);
        if (ver === 0) {
          const groupId = from185(parts[1]);
          const group = MAPPING_GROUPS[groupId];
          if (group) mappingInfo = `[ID:${groupId}] ${group.name}`;
          else mappingInfo = `ID:${groupId} (Undefined)`;
        }
      }
    } catch (e) {}
    return { normal, intermediate, compressed: intermediate, normalLen: normal.length, intermediateLen: intermediate.length, compressedLen: intermediate.length, rate: normal.length > 0 ? (intermediate.length / normal.length) * 100 : 0, mappingInfo };
  }, [data]);

  const projectProgress = useMemo(() => {
    if (!data || activeTasks.length === 0) return 0;
    const parentIds = new Set(activeTasks.map(t => t.parentId).filter(Boolean));
    const leafTasks = activeTasks.filter(t => !parentIds.has(t.id));
    let total = 0, count = 0;
    leafTasks.forEach(t => { total += t.status === 2 ? 100 : t.status === 1 ? 50 : 0; count++; });
    return count === 0 ? 0 : Math.round(total / count);
  }, [data, activeTasks]);

  useEffect(() => {
    if (activeParentId && data) {
      if (!data.tasks.some(t => t.id === activeParentId && !t.isDeleted)) setActiveParentId(null);
    }
  }, [data, activeParentId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) {
          if (canRedo) { e.preventDefault(); redo(); }
          return;
        }
        if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
          if (canUndo) { e.preventDefault(); undo(); }
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const save = useCallback((newTasks: Task[]) => {
    if (!data) return;
    setData({ ...data, tasks: recalculateStatus(newTasks), lastSynced: Date.now() });
  }, [data, setData]);

  const updateExternalProjectTask = useCallback((targetProjId: string, taskId: string, newStatus: 0 | 1 | 2 | 3) => {
      const targetProject = projects.find(p => p.id === targetProjId);
      if (!targetProject) return;
      const newTasks = targetProject.tasks.map(t => t.id === taskId ? { ...t, status: newStatus, lastUpdated: Date.now() } : t);
      updateProject({ ...targetProject, tasks: recalculateStatus(newTasks), lastSynced: Date.now() });
  }, [projects, updateProject]);

  const updateExternalProjectParentStatus = useCallback((targetProjId: string, parentId: string, newStatus: 0 | 1 | 2 | 3) => {
      const targetProject = projects.find(p => p.id === targetProjId);
      if (!targetProject) return;
      let nextTasks = targetProject.tasks.map(t => (t.parentId === parentId && !t.isDeleted && (newStatus === 2 || t.status !== 2)) ? { ...t, status: newStatus, lastUpdated: Date.now() } : t);
      let calculatedTasks = recalculateStatus(nextTasks).map(t => t.id === parentId ? { ...t, status: newStatus, lastUpdated: Date.now() } : t);
      updateProject({ ...targetProject, tasks: calculatedTasks, lastSynced: Date.now() });
  }, [projects, updateProject]);

  const updateParentStatus = useCallback((id: string, newStatus: 0 | 1 | 2 | 3) => {
    if (id.includes('_')) {
        const [projId, realTaskId] = id.split('_');
        if (!data?.tasks.some(t => t.id === id) && projects.find(p => p.id === projId)) {
            updateExternalProjectParentStatus(projId, realTaskId, newStatus);
            return;
        }
    }
    if (!data) return;
    let nextTasks = data.tasks.map(t => (t.parentId === id && !t.isDeleted && (newStatus === 2 || t.status !== 2)) ? { ...t, status: newStatus, lastUpdated: Date.now() } : t);
    let calculatedTasks = recalculateStatus(nextTasks).map(t => t.id === id ? { ...t, status: newStatus, lastUpdated: Date.now() } : t);
    setData({ ...data, tasks: calculatedTasks, lastSynced: Date.now() });
  }, [data, setData, projects, updateExternalProjectParentStatus]);

  const updateTaskStatus = useCallback((id: string, newStatus: 0 | 1 | 2 | 3) => {
    if (id.includes('_')) {
        const [projId, realTaskId] = id.split('_');
        if (!data?.tasks.some(t => t.id === id) && projects.find(p => p.id === projId)) {
            updateExternalProjectTask(projId, realTaskId, newStatus);
            return;
        }
    }
    if (!data) return;
    save(data.tasks.map(t => t.id === id ? { ...t, status: newStatus, lastUpdated: Date.now() } : t));
  }, [data, save, projects, updateExternalProjectTask]);

  const addTask = useCallback((name: string, deadline?: number, parentId?: string) => {
    if (!data) return;
    let targetParentId = parentId;
    if (targetParentId && !data.tasks.some(t => t.id === targetParentId && !t.isDeleted)) targetParentId = undefined;
    if (data.tasks.some(t => !t.isDeleted && t.parentId === targetParentId && t.name === name)) { alert('同名のタスクが存在します。'); return; }
    let candidateNum = activeTasks.length === 0 ? 1 : data.tasks.length + 1;
    let newId = candidateNum.toString(36);
    while (data.tasks.some(t => t.id === newId)) { newId = (++candidateNum).toString(36); }
    const siblings = data.tasks.filter(t => !t.isDeleted && t.parentId === targetParentId);
    const maxOrder = siblings.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
    save([...data.tasks, { id: newId, name, status: 0, deadline, lastUpdated: Date.now(), parentId: activeTasks.length === 0 ? undefined : targetParentId, order: activeTasks.length === 0 ? 1 : maxOrder + 1 }]);
  }, [data, activeTasks, save]);

  const deleteTask = useCallback((taskId: string) => {
    if (!data || !confirm(`タスクを削除しますか？`)) return;
    const idsToDelete = new Set<string>();
    const stack = [taskId];
    while (stack.length > 0) {
      const currentId = stack.pop()!;
      idsToDelete.add(currentId);
      data.tasks.filter(t => !t.isDeleted && t.parentId === currentId).forEach(c => stack.push(c.id));
    }
    save(data.tasks.map(t => idsToDelete.has(t.id) ? { ...t, isDeleted: true, lastUpdated: Date.now() } : t));
    if (menuOpenTaskId === taskId) setMenuOpenTaskId(null);
  }, [data, save, menuOpenTaskId]);

  const renameTask = useCallback((id: string, newName: string) => {
    if (!data || !newName.trim()) return;
    const targetTask = data.tasks.find(t => t.id === id);
    if (!targetTask || data.tasks.some(t => !t.isDeleted && t.id !== id && t.parentId === targetTask.parentId && t.name === newName)) return;
    save(data.tasks.map(t => t.id === id ? { ...t, name: newName, lastUpdated: Date.now() } : t));
  }, [data, save]);

  const updateTaskDeadline = useCallback((id: string, dateStr: string) => {
    if (!data) return;
    save(data.tasks.map(t => t.id === id ? { ...t, deadline: dateStr ? new Date(dateStr).getTime() : undefined, lastUpdated: Date.now() } : t));
  }, [data, save]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!data) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const overIdStr = String(over.id), isNestDrop = overIdStr.startsWith('nest-'), targetIdRaw = isNestDrop ? overIdStr.replace('nest-', '') : overIdStr;
    const activeTask = data.tasks.find(t => t.id === active.id), overTask = data.tasks.find(t => t.id === targetIdRaw);
    if (!activeTask || !overTask) return;
    const nextParentId = isNestDrop ? overTask.id : overTask.parentId;
    if (nextParentId === activeTask.id) return;
    let currentCheckId = nextParentId;
    while (currentCheckId) { if (currentCheckId === activeTask.id) return; currentCheckId = data.tasks.find(t => t.id === currentCheckId)?.parentId; }
    
    const newTasks = [...data.tasks];
    if (activeTask.parentId !== nextParentId) {
      const taskIndex = newTasks.findIndex(t => t.id === active.id);
      newTasks[taskIndex] = { ...newTasks[taskIndex], parentId: nextParentId };
    }
    const siblings = newTasks.filter(t => !t.isDeleted && t.parentId === nextParentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (!isNestDrop) {
      const oldIndex = siblings.findIndex(t => t.id === active.id), newIndex = siblings.findIndex(t => t.id === targetIdRaw);
      if (oldIndex !== -1 && newIndex !== -1) {
        arrayMove(siblings, oldIndex, newIndex).forEach((t, idx) => {
           const globalIdx = newTasks.findIndex(nt => nt.id === t.id);
           if (globalIdx > -1) newTasks[globalIdx] = { ...newTasks[globalIdx], order: idx + 1 };
        });
        save(newTasks); return;
      }
    }
    siblings.forEach((t, index) => {
      const globalIndex = newTasks.findIndex(nt => nt.id === t.id);
      if (globalIndex !== -1) newTasks[globalIndex] = { ...newTasks[globalIndex], order: index + 1, lastUpdated: Date.now() };
    });
    save(newTasks);
  }, [data, save]);

  const toggleNodeExpansion = useCallback((nodeId: string) => { setCollapsedNodeIds(prev => { const next = new Set(prev); next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId); return next; }); }, []);
  
  const handleImportFromUrl = useCallback((urlStr: string) => {
    try {
      const targetUrl = urlStr.startsWith('http') ? urlStr : `${window.location.origin}${urlStr.startsWith('/') ? '' : '/'}${urlStr}`;
      const url = new URL(targetUrl);
      const compressed = url.searchParams.get('d');
      if (!compressed) { alert('URLに有効なデータ(dパラメータ)が含まれていません。'); return; }
      const incoming = decompressData(compressed);
      if (incoming) {
        if (data && JSON.stringify(incoming.tasks) === JSON.stringify(data.tasks) && incoming.projectName === data.projectName) { alert('インポートされたデータは現在のプロジェクトと完全に一致しています。'); return; }
        let targetId = '';
        const sameNameProject = projects.find(p => p.projectName === incoming.projectName);
        if (sameNameProject) { if (sameNameProject.tasks.every(t => t.isDeleted)) targetId = sameNameProject.id; } 
        else { if (data && data.tasks.every(t => t.isDeleted)) targetId = data.id; }
        if (targetId) { const newData = { ...incoming, id: targetId, lastSynced: Date.now() }; setData(newData); if (targetId !== activeId) switchProject(targetId); alert(`プロジェクト名：${incoming.projectName} を読み込みました。`); return; }
        setIncomingData(incoming);
      } else { alert('データの復元に失敗しました。'); }
    } catch (e) { console.error(e); alert('URLの形式が正しくありません。'); }
  }, [data, setIncomingData, setData, projects, activeId, switchProject]);

  const handleFileImport = useCallback((f: File) => {
      const r = new FileReader();
      r.onload = (e) => {
        try {
          const incoming = JSON.parse(e.target?.result as string);
          let targetId = '';
          const sameNameProject = projects.find(p => p.projectName === incoming.projectName);
          if (sameNameProject) { if (sameNameProject.tasks.every(t => t.isDeleted)) targetId = sameNameProject.id; } 
          else { if (data && data.tasks.every(t => t.isDeleted)) targetId = data.id; }
          if (targetId) { const newData = { ...incoming, id: targetId, lastSynced: Date.now() }; setData(newData); if (targetId !== activeId) switchProject(targetId); alert(`プロジェクト名：${incoming.projectName} を読み込みました。`); } 
          else { setIncomingData(incoming); }
        } catch(err) { alert('JSONの読み込みに失敗しました'); }
      };
      r.readAsText(f);
  }, [data, setIncomingData, setData, projects, activeId, switchProject]);

  const handleAddTaskWrapper = useCallback((targetParentId?: string) => {
    if (!inputTaskName.trim()) return;
    addTask(inputTaskName, inputDateStr ? new Date(inputDateStr).getTime() : undefined, targetParentId ?? activeParentId ?? undefined);
    setInputTaskName(''); setInputDateStr(''); 
  }, [addTask, inputTaskName, inputDateStr, activeParentId]);
  const handleTaskClick = useCallback((node: TaskNode) => { inputTaskName.trim() ? handleAddTaskWrapper(node.id) : setActiveParentId(node.id); }, [inputTaskName, handleAddTaskWrapper]);
  const handleBoardClick = useCallback(() => { setActiveParentId(null); setMenuOpenTaskId(null); }, []);
  const handleProjectNameClick = useCallback(() => { if (data) setShowRenameModal(true); }, [data]);

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    const hitSortable = pointerCollisions.find(c => !String(c.id).startsWith('nest-') && c.id !== 'root-board');
    const hitNest = pointerCollisions.find(c => String(c.id).startsWith('nest-'));
    if (hitSortable || hitNest) {
        const targetId = hitSortable?.id || (hitNest ? String(hitNest.id).replace('nest-', '') : null);
        if (targetId) {
            const nestContainer = args.droppableContainers.find(c => c.id === `nest-${targetId}`);
            if (nestContainer) return [{ id: nestContainer.id, data: nestContainer.data }];
        }
    }
    const boardCollision = pointerCollisions.find(c => c.id === 'root-board');
    return boardCollision ? [boardCollision] : [];
  }, []);

  return {
    data, setData, incomingData, setIncomingData, targetLocalData, projects, activeId, activeTasks, rootNodes, projectProgress, debugInfo, activeParent, calendarTasks,
    showDebug, setShowDebug, showSidebar, setShowSidebar, showProjectMenu, setShowProjectMenu, showRenameModal, setShowRenameModal, showAllProjectsInCalendar, setShowAllProjectsInCalendar, collapsedNodeIds, inputTaskName, setInputTaskName, inputDateStr, setInputDateStr, activeParentId, setActiveParentId,
    menuOpenTaskId, setMenuOpenTaskId, 
    addProject, importNewProject, switchProject, deleteProject, getShareUrl,
    addTask, deleteTask, renameTask, updateTaskStatus, updateTaskDeadline, updateParentStatus,
    handleImportFromUrl, handleFileImport, handleAddTaskWrapper, handleTaskClick, handleBoardClick, handleProjectNameClick, toggleNodeExpansion, 
    undo, redo, canUndo, canRedo, sensors, handleDragEnd, customCollisionDetection,
    uploadProject, syncLimitState, resolveSyncLimit, currentLimit,
    syncState // ★ 追加
  };
};