// NOTE: App.tsxのロジック部分はこのファイルに記述すること。
// 今後、ロジックの変更や追加が必要な場合は、App.tsxではなくこのファイルを修正してください。

import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  KeyboardSensor, 
  MouseSensor, 
  TouchSensor, 
  useSensor, 
  useSensors, 
  pointerWithin,
  type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
  arrayMove
} from '@dnd-kit/sortable';

import type { Task } from '../types'; 
import { useAppData } from './useAppData';
import { getIntermediateJson, from185, decompressData } from '../utils/compression';
import { MAPPING_GROUPS_V0 as MAPPING_GROUPS } from '../utils/versions/v0';

type TaskNode = Task & { children: TaskNode[] };

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

export const useTaskOperations = () => {
  // AppDataの取得
  const { 
    data, 
    setData, 
    updateProject, 
    incomingData, 
    setIncomingData, 
    getShareUrl,
    projects,
    activeId,
    addProject,
    importNewProject,
    switchProject,
    deleteProject,
    undo, 
    redo,
    canUndo, // 追加
    canRedo  // 追加
  } = useAppData();

  // --------------------------------------------------------------------------
  // UI State
  // --------------------------------------------------------------------------
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showAllProjectsInCalendar, setShowAllProjectsInCalendar] = useState(false);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [inputTaskName, setInputTaskName] = useState('');
  const [inputDateStr, setInputDateStr] = useState('');
  
  // 追加: メニューが開いているタスクID（排他制御用）
  const [menuOpenTaskId, setMenuOpenTaskId] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Derived Data
  // --------------------------------------------------------------------------
  const activeTasks = useMemo(() => {
    return data ? data.tasks.filter(t => !t.isDeleted) : [];
  }, [data]);

  // カレンダー表示用のタスクリストを生成
  const calendarTasks = useMemo(() => {
    if (!data) return [];
    
    // 現在のプロジェクトのみ表示
    if (!showAllProjectsInCalendar) {
      // hasChildrenを付与して返す
      return activeTasks.map(t => ({
          ...t,
          hasChildren: activeTasks.some(child => !child.isDeleted && child.parentId === t.id)
      }));
    }

    // 全プロジェクトのタスクを結合
    const allTasks: Task[] = [];
    projects.forEach(proj => {
      const projTasks = proj.tasks.filter(t => !t.isDeleted);
      const isCurrentProject = proj.id === data.id;

      const safeTasks = projTasks.map(t => {
          // 自分のプロジェクト内で子タスクを持つか判定
          const hasChildren = projTasks.some(child => !child.isDeleted && child.parentId === t.id);

          return {
            ...t,
            // ID: 現在のプロジェクトならそのまま、他なら複合ID
            id: isCurrentProject ? t.id : `${proj.id}_${t.id}`,
            // プロジェクト情報
            sourceProjectName: isCurrentProject ? undefined : proj.projectName,
            sourceProjectId: isCurrentProject ? undefined : proj.id,
            hasChildren
          };
      });
      
      allTasks.push(...safeTasks);
    });

    return allTasks;
  }, [data, projects, activeTasks, showAllProjectsInCalendar]);

  const activeParent = useMemo(() => {
    if (!data || !activeParentId) return null;
    return data.tasks.find(t => t.id === activeParentId) || null;
  }, [data, activeParentId]);

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
    } catch (e) { console.error("Failed to parse mapping group", e); }
    const compressed = intermediate; 
    const rate = normal.length > 0 ? (compressed.length / normal.length) * 100 : 0;
    return { normal, intermediate, compressed, normalLen: normal.length, intermediateLen: intermediate.length, compressedLen: compressed.length, rate, mappingInfo };
  }, [data]);

  const projectProgress = useMemo(() => {
    if (!data || activeTasks.length === 0) return 0;
    const parentIds = new Set(activeTasks.map(t => t.parentId).filter(Boolean));
    const leafTasks = activeTasks.filter(t => !parentIds.has(t.id));
    let total = 0, count = 0;
    leafTasks.forEach(t => {
      total += t.status === 2 ? 100 : t.status === 1 ? 50 : 0;
      count++;
    });
    if (count === 0) return 0;
    return Math.round(total / count);
  }, [data, activeTasks]);

  // --------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (activeParentId && data) {
      const exists = data.tasks.some(t => t.id === activeParentId && !t.isDeleted);
      if (!exists) {
        setActiveParentId(null);
      }
    }
  }, [data, activeParentId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) {
          if (canRedo) {
            e.preventDefault();
            redo();
          }
          return;
        }
        
        if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
          if (canUndo) {
            e.preventDefault();
            undo();
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  // --------------------------------------------------------------------------
  // Task Logic (CRUD & Status)
  // --------------------------------------------------------------------------
  const save = useCallback((newTasks: Task[]) => {
    if (!data) return;
    setData({
      ...data,
      tasks: recalculateStatus(newTasks),
      lastSynced: Date.now()
    });
  }, [data, setData]);

  const updateExternalProjectTask = useCallback((targetProjId: string, taskId: string, newStatus: 0 | 1 | 2 | 3) => {
      const targetProject = projects.find(p => p.id === targetProjId);
      if (!targetProject) return;

      const newTasks = targetProject.tasks.map(t => 
          t.id === taskId ? { ...t, status: newStatus, lastUpdated: Date.now() } : t
      );
      
      const recalculated = recalculateStatus(newTasks);
      
      updateProject({
          ...targetProject,
          tasks: recalculated,
          lastSynced: Date.now()
      });
  }, [projects, updateProject]);

  const updateExternalProjectParentStatus = useCallback((targetProjId: string, parentId: string, newStatus: 0 | 1 | 2 | 3) => {
      const targetProject = projects.find(p => p.id === targetProjId);
      if (!targetProject) return;

      let nextTasks = [...targetProject.tasks];
    
      if (newStatus === 2) { 
        nextTasks = nextTasks.map(t => 
          (t.parentId === parentId && !t.isDeleted) 
            ? { ...t, status: 2, lastUpdated: Date.now() } 
            : t
        );
      } else if (newStatus === 0) { 
        nextTasks = nextTasks.map(t => 
          (t.parentId === parentId && !t.isDeleted && t.status !== 2) 
            ? { ...t, status: 0, lastUpdated: Date.now() } 
            : t
        );
      } else if (newStatus === 1) { 
        nextTasks = nextTasks.map(t => 
          (t.parentId === parentId && !t.isDeleted && t.status !== 2) 
            ? { ...t, status: 1, lastUpdated: Date.now() } 
            : t
        );
      }

      let calculatedTasks = recalculateStatus(nextTasks);
      calculatedTasks = calculatedTasks.map(t => 
        t.id === parentId 
          ? { ...t, status: newStatus, lastUpdated: Date.now() } 
          : t
      );

      updateProject({
          ...targetProject,
          tasks: calculatedTasks,
          lastSynced: Date.now()
      });

  }, [projects, updateProject]);

  const updateParentStatus = useCallback((id: string, newStatus: 0 | 1 | 2 | 3) => {
    if (id.includes('_')) {
        const [projId, realTaskId] = id.split('_');
        const isCurrent = data?.tasks.some(t => t.id === id);
        if (!isCurrent) {
            const targetProj = projects.find(p => p.id === projId);
            if (targetProj) {
                updateExternalProjectParentStatus(projId, realTaskId, newStatus);
                return;
            }
        }
    }
    
    if (!data) return;
    let nextTasks = [...data.tasks];
    
    if (newStatus === 2) { 
      nextTasks = nextTasks.map(t => 
        (t.parentId === id && !t.isDeleted) 
          ? { ...t, status: 2, lastUpdated: Date.now() } 
          : t
      );
    } else if (newStatus === 0) { 
      nextTasks = nextTasks.map(t => 
        (t.parentId === id && !t.isDeleted && t.status !== 2) 
          ? { ...t, status: 0, lastUpdated: Date.now() } 
          : t
      );
    } else if (newStatus === 1) { 
      nextTasks = nextTasks.map(t => 
        (t.parentId === id && !t.isDeleted && t.status !== 2) 
          ? { ...t, status: 1, lastUpdated: Date.now() } 
          : t
      );
    }

    let calculatedTasks = recalculateStatus(nextTasks);

    calculatedTasks = calculatedTasks.map(t => 
      t.id === id 
        ? { ...t, status: newStatus, lastUpdated: Date.now() } 
        : t
    );

    setData({
      ...data,
      tasks: calculatedTasks,
      lastSynced: Date.now()
    });
  }, [data, setData, projects, updateExternalProjectParentStatus]);

  const updateTaskStatus = useCallback((id: string, newStatus: 0 | 1 | 2 | 3) => {
    if (id.includes('_')) {
        const [projId, realTaskId] = id.split('_');
        const isCurrent = data?.tasks.some(t => t.id === id);
        if (!isCurrent) {
            const targetProj = projects.find(p => p.id === projId);
            if (targetProj) {
                updateExternalProjectTask(projId, realTaskId, newStatus);
                return;
            }
        }
    }

    if (!data) return;
    const newTasks = data.tasks.map(t =>
      t.id === id ? { ...t, status: newStatus, lastUpdated: Date.now() } : t
    );
    save(newTasks);
  }, [data, save, projects, updateExternalProjectTask]);

  const addTask = useCallback((name: string, deadline?: number, parentId?: string) => {
    if (!data) return;
    let targetParentId = parentId;
    if (targetParentId) {
        const parentExists = data.tasks.some(t => t.id === targetParentId && !t.isDeleted);
        if (!parentExists) targetParentId = undefined;
    }
    const normalizedName = name;
    const isDuplicate = data.tasks.some(t => !t.isDeleted && t.parentId === targetParentId && t.name === normalizedName);
    if (isDuplicate) { alert('同じ階層に同名のタスクが既に存在します。'); return; }
    const existingIds = new Set(data.tasks.map(t => t.id));
    let candidateNum = activeTasks.length === 0 ? 1 : data.tasks.length + 1;
    let newId = candidateNum.toString(36);
    while (existingIds.has(newId)) { candidateNum++; newId = candidateNum.toString(36); }
    const siblings = data.tasks.filter(t => !t.isDeleted && t.parentId === targetParentId);
    const maxOrder = siblings.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
    const nextOrder = siblings.length === 0 ? 1 : maxOrder + 1;
    const newTask: Task = {
      id: newId, name: normalizedName, status: 0, deadline: deadline, lastUpdated: Date.now(),
      parentId: activeTasks.length === 0 ? undefined : targetParentId, order: activeTasks.length === 0 ? 1 : nextOrder
    };
    save([...data.tasks, newTask]);
  }, [data, activeTasks, save]);

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
    const newTasks = data.tasks.map(t => idsToDelete.has(t.id) ? { ...t, isDeleted: true, lastUpdated: Date.now() } : t);
    save(newTasks);
    // 削除時にメニューが開いていたら閉じる
    if (menuOpenTaskId === taskId) {
      setMenuOpenTaskId(null);
    }
  }, [data, save, menuOpenTaskId]);

  const renameTask = useCallback((id: string, newName: string) => {
    if (!data || !newName.trim()) return;
    const targetTask = data.tasks.find(t => t.id === id);
    if (!targetTask) return;
    const isDuplicate = data.tasks.some(t => !t.isDeleted && t.id !== id && t.parentId === targetTask.parentId && t.name === newName);
    if (isDuplicate) { alert('同じ階層に同名のタスクが既に存在します。'); return; }
    const newTasks = data.tasks.map(t => t.id === id ? { ...t, name: newName, lastUpdated: Date.now() } : t);
    save(newTasks);
  }, [data, save]);

  const updateTaskDeadline = useCallback((id: string, dateStr: string) => {
    if (!data) return;
    let newDeadline: number | undefined;
    if (dateStr) { const [y, m, d] = dateStr.split('-').map(Number); newDeadline = new Date(y, m - 1, d).getTime(); } 
    else { newDeadline = undefined; }
    const newTasks = data.tasks.map(t => t.id === id ? { ...t, deadline: newDeadline, lastUpdated: Date.now() } : t);
    save(newTasks);
  }, [data, save]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!data) return;
    const { active, over } = event;
    if (!over) return;

    // Case: Dropped on the Board Area (Empty space)
    if (over.id === 'root-board') {
        const activeIdStr = String(active.id);
        const activeTask = data.tasks.find(t => t.id === activeIdStr);
        if (!activeTask) return;

        // 1. Get current root tasks sorted by order (excluding self if it was already root)
        const rootTasks = data.tasks
            .filter(t => !t.isDeleted && !t.parentId && t.id !== activeIdStr)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // 2. Calculate Drop X coordinate (Center)
        const activeRect = active.rect.current.translated;
        if (activeRect) {
            const dropCenterX = activeRect.left + activeRect.width / 2;
            
            // 3. Find insertion index based on DOM coordinates
            let insertIndex = rootTasks.length; // Default: Append to end

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

            // 4. Reorder
            const newRootIds = rootTasks.map(t => t.id);
            newRootIds.splice(insertIndex, 0, activeTask.id);

            const newTasks = data.tasks.map(t => {
                const rootIdx = newRootIds.indexOf(t.id);
                if (rootIdx !== -1) {
                    return {
                        ...t,
                        parentId: undefined, // Ensure it's root
                        order: rootIdx + 1,
                        lastUpdated: Date.now()
                    };
                }
                return t;
            });
            save(newTasks);
            return;
        }

        const maxOrder = rootTasks.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
        const newTasks = data.tasks.map(t => 
             t.id === activeIdStr 
             ? { ...t, parentId: undefined, order: maxOrder + 1, lastUpdated: Date.now() } 
             : t
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

  const toggleNodeExpansion = useCallback((nodeId: string) => { setCollapsedNodeIds(prev => { const next = new Set(prev); if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId); return next; }); }, []);
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
    let deadline: number | undefined;
    if (inputDateStr) { const [y, m, d] = inputDateStr.split('-').map(Number); deadline = new Date(y, m - 1, d).getTime(); }
    addTask(inputTaskName, deadline, targetParentId ?? activeParentId ?? undefined);
    setInputTaskName(''); setInputDateStr(''); 
  }, [addTask, inputTaskName, inputDateStr, activeParentId]);

  const handleTaskClick = useCallback((node: TaskNode) => {
    if (inputTaskName.trim()) { handleAddTaskWrapper(node.id); } 
    else { setActiveParentId(node.id); }
  }, [inputTaskName, handleAddTaskWrapper]);

  const handleBoardClick = useCallback(() => { 
    setActiveParentId(null);
    setMenuOpenTaskId(null); 
  }, []);
  const handleProjectNameClick = useCallback(() => { if (data) setShowRenameModal(true); }, [data]);

  // --------------------------------------------------------------------------
  // Dnd Sensors & Collision
  // --------------------------------------------------------------------------
  const sensors = useSensors(
    useSensor(MouseSensor, {
        activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
        activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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
            if (nestContainer) {
                return [{ id: nestContainer.id, data: nestContainer.data }];
            }
        }
    }

    const boardCollision = pointerCollisions.find(c => c.id === 'root-board');
    if (boardCollision) {
        return [boardCollision];
    }

    return [];
  }, []);

  return {
    data, setData, incomingData, setIncomingData, targetLocalData, projects, activeId, activeTasks, rootNodes, projectProgress, debugInfo, activeParent, calendarTasks,
    showDebug, setShowDebug, showSidebar, setShowSidebar, showProjectMenu, setShowProjectMenu, showRenameModal, setShowRenameModal, showAllProjectsInCalendar, setShowAllProjectsInCalendar, collapsedNodeIds, inputTaskName, setInputTaskName, inputDateStr, setInputDateStr, activeParentId, setActiveParentId,
    menuOpenTaskId, setMenuOpenTaskId, 
    addProject, importNewProject, switchProject, deleteProject, getShareUrl,
    addTask, deleteTask, renameTask, updateTaskStatus, updateTaskDeadline, updateParentStatus,
    handleImportFromUrl, handleFileImport, handleAddTaskWrapper, handleTaskClick, handleBoardClick, handleProjectNameClick, toggleNodeExpansion, 
    undo, redo,
    canUndo, canRedo, // 追加
    sensors, handleDragEnd, customCollisionDetection,
  };
};