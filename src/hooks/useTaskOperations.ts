import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

import type { Task, UserRole } from '../types'; 
import { useAppData } from './useAppData';
import { getIntermediateJson, from185, decompressData } from '../utils/compression';
import { MAPPING_GROUPS_V0 as MAPPING_GROUPS } from '../utils/versions/v0';

import { recalculateStatus } from '../utils/taskUtils';
import { useSharedProject } from './useSharedProject';
import { useTaskDnD } from './useTaskDnD';

type TaskNode = Task & { children: TaskNode[] };

export const useTaskOperations = () => {
  const { getToken } = useAuth();
  
  const { 
    data, setData, updateProject, incomingData, setIncomingData, getShareUrl,
    projects, activeId, addProject, importNewProject, switchProject, deleteProject,
    undo, redo, canUndo, canRedo, uploadProject, syncLimitState, resolveSyncLimit, currentLimit, syncState
  } = useAppData();

  // モーダル表示用のステートを受け取る
  const { isCheckingShared, sharedProjectState, setSharedProjectState } = useSharedProject();

  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false); 
  const [showAllProjectsInCalendar, setShowAllProjectsInCalendar] = useState(false);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [inputTaskName, setInputTaskName] = useState('');
  const [inputDateStr, setInputDateStr] = useState('');
  const [menuOpenTaskId, setMenuOpenTaskId] = useState<string | null>(null);

  const activeTasks = useMemo(() => {
    return data ? data.tasks.filter(t => !t.isDeleted) : [];
  }, [data]);

  const calendarTasks = useMemo(() => {
    if (!data) return [];
    if (!showAllProjectsInCalendar) {
      return activeTasks.map(t => ({
          ...t,
          hasChildren: activeTasks.some(child => !child.isDeleted && child.parentId === t.id)
      }));
    }

    const allTasks: Task[] = [];
    projects.forEach(proj => {
      const projTasks = proj.tasks.filter(t => !t.isDeleted);
      const isCurrentProject = proj.id === data.id;

      const safeTasks = projTasks.map(t => {
          const hasChildren = projTasks.some(child => !child.isDeleted && child.parentId === t.id);
          return {
            ...t,
            id: isCurrentProject ? t.id : `${proj.id}_${t.id}`,
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

  useEffect(() => {
    if (activeParentId && data) {
      const exists = data.tasks.some(t => t.id === activeParentId && !t.isDeleted);
      if (!exists) setActiveParentId(null);
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

  useEffect(() => {
    if (showSettingsModal && data && !String(data.id).startsWith('local_') && data.isCloudSync !== false) {
        const fetchMembers = async () => {
            try {
                const token = await getToken();
                const res = await fetch(`http://localhost:5174/api/projects/${data.id}/members`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const resData = await res.json();
                    setData({...data, members: resData.members, isPublic: resData.isPublic, publicRole: resData.publicRole});
                }
            } catch (e) { console.error(e); }
        };
        fetchMembers();
    }
  }, [showSettingsModal, data?.id, data?.isCloudSync, getToken, setData]);

  const save = useCallback((newTasks: Task[]) => {
    if (!data) return;
    setData({
      ...data,
      tasks: recalculateStatus(newTasks),
      lastSynced: Date.now()
    });
  }, [data, setData]);

  const { sensors, customCollisionDetection, handleDragEnd } = useTaskDnD(data, save);

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
        nextTasks = nextTasks.map(t => (t.parentId === parentId && !t.isDeleted) ? { ...t, status: 2, lastUpdated: Date.now() } : t);
      } else if (newStatus === 0) { 
        nextTasks = nextTasks.map(t => (t.parentId === parentId && !t.isDeleted && t.status !== 2) ? { ...t, status: 0, lastUpdated: Date.now() } : t);
      } else if (newStatus === 1) { 
        nextTasks = nextTasks.map(t => (t.parentId === parentId && !t.isDeleted && t.status !== 2) ? { ...t, status: 1, lastUpdated: Date.now() } : t);
      }

      let calculatedTasks = recalculateStatus(nextTasks);
      calculatedTasks = calculatedTasks.map(t => t.id === parentId ? { ...t, status: newStatus, lastUpdated: Date.now() } : t);

      updateProject({ ...targetProject, tasks: calculatedTasks, lastSynced: Date.now() });
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
      nextTasks = nextTasks.map(t => (t.parentId === id && !t.isDeleted) ? { ...t, status: 2, lastUpdated: Date.now() } : t);
    } else if (newStatus === 0) { 
      nextTasks = nextTasks.map(t => (t.parentId === id && !t.isDeleted && t.status !== 2) ? { ...t, status: 0, lastUpdated: Date.now() } : t);
    } else if (newStatus === 1) { 
      nextTasks = nextTasks.map(t => (t.parentId === id && !t.isDeleted && t.status !== 2) ? { ...t, status: 1, lastUpdated: Date.now() } : t);
    }

    let calculatedTasks = recalculateStatus(nextTasks);
    calculatedTasks = calculatedTasks.map(t => t.id === id ? { ...t, status: newStatus, lastUpdated: Date.now() } : t);
    setData({ ...data, tasks: calculatedTasks, lastSynced: Date.now() });
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
    const newTasks = data.tasks.map(t => t.id === id ? { ...t, status: newStatus, lastUpdated: Date.now() } : t);
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

  const toggleNodeExpansion = useCallback((nodeId: string) => { 
    setCollapsedNodeIds(prev => { 
      const next = new Set(prev); 
      if (next.has(nodeId)) next.delete(nodeId); 
      else next.add(nodeId); 
      return next; 
    }); 
  }, []);
  
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
        let targetProj = null;

        if (sameNameProject) { 
          targetProj = sameNameProject;
          if (sameNameProject.tasks.every(t => t.isDeleted)) targetId = sameNameProject.id; 
        } 
        else { 
          targetProj = data;
          if (data && data.tasks.every(t => t.isDeleted)) targetId = data.id; 
        }

        if (targetProj && targetProj.isCloudSync) {
          alert('クラウド上のプロジェクトにマージすることはできません。');
          return;
        }

        if (targetId) { 
          const newData = { ...incoming, id: targetId, lastSynced: Date.now() }; 
          setData(newData); 
          if (targetId !== activeId) switchProject(targetId); 
          alert(`プロジェクト名：${incoming.projectName} を読み込みました。`); 
          return; 
        }
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
          let targetProj = null;

          if (sameNameProject) { 
            targetProj = sameNameProject;
            if (sameNameProject.tasks.every(t => t.isDeleted)) targetId = sameNameProject.id; 
          } 
          else { 
            targetProj = data;
            if (data && data.tasks.every(t => t.isDeleted)) targetId = data.id; 
          }

          if (targetProj && targetProj.isCloudSync) {
            alert('クラウド上のプロジェクトにマージすることはできません。');
            return;
          }

          if (targetId) { 
            const newData = { ...incoming, id: targetId, lastSynced: Date.now() }; 
            setData(newData); 
            if (targetId !== activeId) switchProject(targetId); 
            alert(`プロジェクト名：${incoming.projectName} を読み込みました。`); 
          } 
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
  
  const handleProjectNameClick = useCallback(() => { if (data) setShowSettingsModal(true); }, [data]);

  const handleToggleSync = useCallback(async (enabled: boolean) => {
      if (!data) return;
      if (enabled) {
          uploadProject(data.id);
      } else {
           if (!confirm("クラウド同期をオフにすると、クラウド上のデータは削除されローカルのみの保存になります。よろしいですか？")) return;
           try {
               const token = await getToken();
               await fetch(`http://localhost:5174/api/projects/${data.id}`, {
                   method: 'DELETE',
                   headers: { 'Authorization': `Bearer ${token}` }
               });
               setData({ ...data, isCloudSync: false, shortId: undefined });
           } catch (e) {
               console.error("Failed to disable sync", e);
               alert("同期のオフに失敗しました");
           }
      }
  }, [data, uploadProject, getToken, setData]);

  const handleTogglePublic = useCallback(async (isPublic: boolean) => {
      if (!data || String(data.id).startsWith('local_')) return;
      try {
          const token = await getToken();
          const res = await fetch(`http://localhost:5174/api/projects/${data.id}/public`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ isPublic })
          });
          if (res.ok) {
              setData({ ...data, isPublic });
          } else {
               alert("公開設定の変更に失敗しました");
          }
      } catch (e) {
          console.error(e);
          alert("公開設定の変更に失敗しました");
      }
  }, [data, getToken, setData]);

  const handleInviteUser = useCallback(async (username: string) => {
      if (!data || String(data.id).startsWith('local_')) return;
      try {
          const token = await getToken();
          const res = await fetch(`http://localhost:5174/api/projects/${data.id}/members`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, role: 'viewer' })
          });
          if (res.ok) {
              const resData = await res.json();
              if (resData.member) {
                  const newMembers = [...(data.members || []), resData.member];
                  setData({ ...data, members: newMembers });
                  alert(`${username} を招待しました。`);
              }
          } else {
              const errorData = await res.json();
              alert(`招待に失敗しました: ${errorData.error}`);
          }
      } catch (e) {
          console.error(e);
          alert("招待に失敗しました");
      }
  }, [data, getToken, setData]);

  const handleChangeRole = useCallback(async (memberId: string, newRole: UserRole) => {
      if (!data || String(data.id).startsWith('local_')) return;
      try {
          const token = await getToken();
          const res = await fetch(`http://localhost:5174/api/projects/${data.id}/members/${memberId}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: newRole })
          });
          if (res.ok) {
              const newMembers = (data.members || []).map(m => m.id === memberId ? { ...m, role: newRole } : m);
              setData({ ...data, members: newMembers });
          } else {
              alert("権限の変更に失敗しました");
          }
      } catch (e) {
          console.error(e);
          alert("権限の変更に失敗しました");
      }
  }, [data, getToken, setData]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
      if (!data || String(data.id).startsWith('local_')) return;
      if (!confirm("このメンバーを削除しますか？")) return;
      try {
          const token = await getToken();
          const res = await fetch(`http://localhost:5174/api/projects/${data.id}/members/${memberId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              const newMembers = (data.members || []).filter(m => m.id !== memberId);
              setData({ ...data, members: newMembers });
          } else {
               alert("メンバーの削除に失敗しました");
          }
      } catch (e) {
          console.error(e);
          alert("メンバーの削除に失敗しました");
      }
  }, [data, getToken, setData]);

  return {
    data, setData, incomingData, setIncomingData, targetLocalData, projects, activeId, activeTasks, rootNodes, projectProgress, debugInfo, activeParent, calendarTasks,
    showDebug, setShowDebug, showSidebar, setShowSidebar, showProjectMenu, setShowProjectMenu, showSettingsModal, setShowSettingsModal, showAllProjectsInCalendar, setShowAllProjectsInCalendar, collapsedNodeIds, inputTaskName, setInputTaskName, inputDateStr, setInputDateStr, activeParentId, setActiveParentId,
    menuOpenTaskId, setMenuOpenTaskId, 
    addProject, importNewProject, switchProject, deleteProject, getShareUrl,
    addTask, deleteTask, renameTask, updateTaskStatus, updateTaskDeadline, updateParentStatus,
    handleImportFromUrl, handleFileImport, handleAddTaskWrapper, handleTaskClick, handleBoardClick, handleProjectNameClick, toggleNodeExpansion, 
    handleToggleSync, handleTogglePublic, handleInviteUser, handleChangeRole, handleRemoveMember,
    undo, redo,
    canUndo, canRedo,
    sensors, handleDragEnd, customCollisionDetection,
    uploadProject, syncLimitState, resolveSyncLimit, currentLimit, syncState,
    isCheckingShared, sharedProjectState, setSharedProjectState
  };
};