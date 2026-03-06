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

export const useTaskOperations = () => {
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

  const projectsRef = useRef(projects);
  useEffect(() => { projectsRef.current = projects; }, [projects]);

  // 2. 派生データの計算 (useTaskView)
  const { activeTasks, calendarTasks, rootNodes, projectProgress, debugInfo } = useTaskView(data, projects, showAllProjectsInCalendar);

  // 3. タスクの更新処理 (useTaskMutations)
  const { save, updateParentStatus, updateTaskStatus, deleteTask, renameTask, updateTaskDeadline, handleAddTaskWrapper: baseHandleAddTask, moveTaskOrder, toggleTaskExpand } = useTaskMutations(
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

  // ドラッグ&ドロップの処理
  const { sensors, customCollisionDetection, handleDragEnd } = useTaskDnD(data, save);

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

  // 互換性維持のため、タスクデータから閉じたノードのSetを生成する
  const collapsedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (data?.tasks) {
      data.tasks.forEach(t => {
        // デフォルトは展開とみなすため、明示的に false の場合のみ閉じる
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
    addTask: baseHandleAddTask,
    handleImportFromUrl, handleFileImport, handleAddTaskWrapper, handleTaskClick, handleBoardClick, handleProjectNameClick, toggleNodeExpansion, 
    handleToggleSync, handleTogglePublic, handleInviteUser, handleChangeRole, handleRemoveMember, handleToggleIncludeDataInLink,
    undo, redo, canUndo, canRedo,
    sensors, handleDragEnd, customCollisionDetection,
    uploadProject, syncLimitState, resolveSyncLimit, currentLimit, syncState,
    isCheckingShared, sharedProjectState, setSharedProjectState,
    addOrUpdateProject, importCloudCheck, handleCloudImportChoice, handleUpdateProjectName, forceSync
  };
};