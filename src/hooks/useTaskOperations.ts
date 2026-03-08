// src/hooks/useTaskOperations.ts
// 役割: 分割されたカスタムフック（設定、インポート、操作、計算）を統合し、Appコンポーネントに提供する Facade
// なぜ: Appコンポーネントの肥大化を防ぎ、各機能の結合を整理するため

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';

import type { Task } from '../types'; 
import { useAppData } from './useAppData';
import { useSharedProject } from './useSharedProject';
import { useTaskDnD } from './useTaskDnD';

import { useTaskView } from './useTaskView';
import { useTaskMutations } from './useTaskMutations';
import { useProjectSettings } from './useProjectSettings';
import { useProjectImport } from './useProjectImport';

type TaskNode = Task & { children: TaskNode[] };

export const useTaskOperations = (boardLayout: 'horizontal' | 'vertical' = 'horizontal') => {
  const { getToken } = useAuth();
  
  // 1. 全体データ管理 (useAppData)
  const { 
    data, setData, updateProject, incomingData, setIncomingData, getShareUrl,
    projects, activeId, addProject, importNewProject, switchProject, deleteProject,
    undo, redo, canUndo, canRedo, uploadProject, syncLimitState, resolveSyncLimit, currentLimit, syncState,
    addOrUpdateProject, forceSync
  } = useAppData();

  const { isCheckingShared, sharedProjectState, setSharedProjectState } = useSharedProject();

  // UI用ステート
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false); 
  const [showAllProjectsInCalendar, setShowAllProjectsInCalendar] = useState(false);
  const [inputTaskName, setInputTaskName] = useState('');
  const [inputDateStr, setInputDateStr] = useState('');
  const [menuOpenTaskId, setMenuOpenTaskId] = useState<string | null>(null);

  // 追加: ソート関連のステート
  const [sortConfig, setSortConfig] = useState<{ type: string, direction: string }>({ type: 'custom', direction: 'asc' });
  const [tempOrderMap, setTempOrderMap] = useState<Record<string, number>>({});

  const projectsRef = useRef(projects);
  useEffect(() => { projectsRef.current = projects; }, [projects]);

  // 追加: ソートの適用ロジック
  const applySort = useCallback((type: string, direction: string) => {
    setSortConfig({ type, direction });
    if (type === 'custom' || !data) return;

    const newMap: Record<string, number> = {};
    const rootTasks = data.tasks.filter((t: Task) => !t.isDeleted && !t.parentId);

    // なぜ: 各タスクの進捗度や子タスクの有無、ステータスソート値を事前に取得するため
    const getTaskProgress = (taskId: string, allTasks: Task[]) => {
        const children = allTasks.filter(t => !t.isDeleted && t.parentId === taskId);
        const hasChildren = children.length > 0;
        
        const task = allTasks.find(t => t.id === taskId);
        const status = task?.status ?? 0;
        let statusSortValue = 0;
        if (status === 0) statusSortValue = 0; // 未着手
        else if (status === 1) statusSortValue = 1; // 進行中
        else if (status === 3) statusSortValue = 2; // 休止
        else if (status === 2) statusSortValue = 3; // 完了

        if (!hasChildren) {
            return { hasChildren: false, progress: 0, statusSortValue };
        }

        const getLeafTasks = (id: string): Task[] => {
            const childs = allTasks.filter(t => !t.isDeleted && t.parentId === id);
            if (childs.length === 0) {
                const t = allTasks.find(t => t.id === id);
                return t ? [t] : [];
            }
            let leaves: Task[] = [];
            for (const c of childs) {
                leaves = leaves.concat(getLeafTasks(c.id));
            }
            return leaves;
        };

        const leaves = getLeafTasks(taskId);
        let total = 0;
        let count = 0;
        leaves.forEach(l => {
            total += l.status === 2 ? 100 : l.status === 1 ? 50 : 0;
            count++;
        });
        const progress = count === 0 ? 0 : total / count;

        return { hasChildren: true, progress, statusSortValue };
    };

    const sortGroup = (tasks: Task[]) => {
        tasks.sort((a, b) => {
            let diff = 0;
            if (type === 'progress') {
                const aInfo = getTaskProgress(a.id, data.tasks);
                const bInfo = getTaskProgress(b.id, data.tasks);
                
                if (aInfo.hasChildren !== bInfo.hasChildren) {
                    diff = aInfo.hasChildren ? 1 : -1;
                } else if (!aInfo.hasChildren) {
                    diff = aInfo.statusSortValue - bInfo.statusSortValue;
                } else {
                    diff = aInfo.progress - bInfo.progress;
                }
            } else if (type === 'updated') {
                diff = (a.lastUpdated || 0) - (b.lastUpdated || 0);
            }
            return direction === 'asc' ? diff : -diff;
        });
        tasks.forEach((t, i) => {
            newMap[t.id] = i + 1;
        });
        tasks.forEach(t => {
            const children = data.tasks.filter((nt: Task) => !nt.isDeleted && nt.parentId === t.id);
            if (children.length > 0) sortGroup(children);
        });
    };
    sortGroup(rootTasks);
    setTempOrderMap(newMap);
  }, [data]);

  // 2. 派生データの計算 (useTaskView) にソート情報を渡す
  const { activeTasks, calendarTasks, rootNodes, projectProgress, debugInfo } = useTaskView(data, projects, showAllProjectsInCalendar, sortConfig, tempOrderMap);

  // 3. タスクの更新処理 (useTaskMutations)
  const { save, updateParentStatus, updateTaskStatus, deleteTask, renameTask, updateTaskDeadline, handleAddTaskWrapper: baseHandleAddTask, moveTaskOrder, toggleTaskExpand, updateTaskDetails } = useTaskMutations(
    data, setData, projectsRef, activeId, updateProject, activeTasks, menuOpenTaskId, setMenuOpenTaskId
  );

  const handleAddTaskWrapper = useCallback((targetParentId?: string) => {
    baseHandleAddTask(inputTaskName, inputDateStr, activeParentId, targetParentId);
    setInputTaskName(''); setInputDateStr('');
  }, [baseHandleAddTask, inputTaskName, inputDateStr, activeParentId]);

  // 4. プロジェクト設定の処理 (useProjectSettings)
  const { handleUpdateProjectName, handleToggleSync, handleTogglePublic, handleInviteUser, handleChangeRole, handleRemoveMember, handleToggleIncludeDataInLink } = useProjectSettings(
    data, setData, getToken, uploadProject, projectsRef, showSettingsModal
  );

  // 5. プロジェクトのインポート処理 (useProjectImport)
  const { targetLocalData, importCloudCheck, handleCloudImportChoice, handleImportFromUrl, handleFileImport } = useProjectImport(
    data, projectsRef, activeId, addOrUpdateProject, switchProject, deleteProject, setIncomingData, incomingData, getToken
  );

  // ドラッグ&ドロップの処理 にソート情報を渡す
  const { sensors, customCollisionDetection, handleDragEnd } = useTaskDnD(data, save, boardLayout, sortConfig, tempOrderMap, setTempOrderMap);

  // その他のUIハンドリング
  useEffect(() => {
    if (activeParentId && data) {
      const exists = (data.tasks || []).some((t: Task) => t.id === activeParentId && !t.isDeleted);
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

  const collapsedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (data?.tasks) {
      data.tasks.forEach(t => {
        if (t.isExpanded === false) {
          set.add(t.id);
        }
      });
    }
    return set;
  }, [data]);

  const toggleNodeExpansion = useCallback((nodeId: string) => { 
    toggleTaskExpand(nodeId);
  }, [toggleTaskExpand]);

  const handleTaskClick = useCallback((node: TaskNode) => { setActiveParentId(node.id); }, []);
  const handleBoardClick = useCallback(() => { setActiveParentId(null); setMenuOpenTaskId(null); }, []);
  const handleProjectNameClick = useCallback(() => { if (data) setShowSettingsModal(true); }, [data]);

  return {
    data, setData, incomingData, setIncomingData, targetLocalData, projects, activeId, activeTasks, rootNodes, projectProgress, debugInfo, calendarTasks,
    showDebug, setShowDebug, showSidebar, setShowSidebar, showProjectMenu, setShowProjectMenu, showSettingsModal, setShowSettingsModal, showAllProjectsInCalendar, setShowAllProjectsInCalendar, collapsedNodeIds, inputTaskName, setInputTaskName, inputDateStr, setInputDateStr, activeParentId, setActiveParentId,
    menuOpenTaskId, setMenuOpenTaskId, 
    addProject, importNewProject, switchProject, deleteProject, getShareUrl,
    deleteTask, renameTask, updateTaskStatus, updateTaskDeadline, updateParentStatus, moveTaskOrder,
    updateTaskDetails,
    addTask: baseHandleAddTask,
    handleImportFromUrl, handleFileImport, handleAddTaskWrapper, handleTaskClick, handleBoardClick, handleProjectNameClick, toggleNodeExpansion, 
    handleToggleSync, handleTogglePublic, handleInviteUser, handleChangeRole, handleRemoveMember, handleToggleIncludeDataInLink,
    undo, redo, canUndo, canRedo,
    sensors, handleDragEnd, customCollisionDetection,
    uploadProject, syncLimitState, resolveSyncLimit, currentLimit, syncState,
    isCheckingShared, sharedProjectState, setSharedProjectState,
    addOrUpdateProject, importCloudCheck, handleCloudImportChoice, handleUpdateProjectName, forceSync,
    sortConfig, applySort
  };
};