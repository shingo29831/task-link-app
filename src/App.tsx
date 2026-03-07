// src/App.tsx
// 役割: アプリケーションのメインエントリーおよび全体のUIレイアウト・状態管理
// なぜ: ドラッグ＆ドロップや認証、メインボードの描画など主要機能を集約するため

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  DndContext, DragOverlay, type DragStartEvent, type DragEndEvent, type DragOverEvent
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth, useUser } from "@clerk/clerk-react";
import { useTranslation } from 'react-i18next';

import { useTaskOperations } from './hooks/useTaskOperations';
import { useResponsive } from './hooks/useResponsive';
import { useUserSettings } from './hooks/useUserSettings';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { ProjectControls } from './components/ProjectControls';
import { TaskCalendar } from './components/TaskCalendar';
import type { Task } from './types';
import { MergeModal } from './components/MergeModal';
import { SortableTaskItem } from './components/SortableTaskItem';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { TaskAddModal } from './components/TaskAddModal';
import { 
  IconUndo, IconRedo, IconCalendar, IconCaretDown, IconPlus, 
  IconHelp, IconCloudUpload, IconLoader, IconCheckCircle, IconError 
} from './components/Icons';
import { SharedProjectModal } from './components/SharedProjectModal';
import { HelpModal } from './components/HelpModal';
import { TaskEditModal } from './components/TaskEditModal';
import { UserSettingsModal } from './components/UserSettingsModal'; 

import { FormattedProjectName } from './components/FormattedProjectName';
import { SyncLimitModal } from './components/SyncLimitModal';
import { InteractiveBoardArea, StaticBoardArea } from './components/BoardArea';

type TaskNode = Task & { children: TaskNode[] };

function App() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const { t } = useTranslation();
  
  const { settings } = useUserSettings();
  const { windowWidth, isMobile, isNarrowLayout } = useResponsive();

  const boardLayout = useMemo(() => {
    if (settings?.customBoardLayout) {
      if (windowWidth <= 480) return settings.boardLayoutMobile || 'vertical';
      if (windowWidth <= 1024) return settings.boardLayoutTablet || 'horizontal';
      return settings.boardLayoutDesktop || 'horizontal';
    }
    return settings?.boardLayout || 'horizontal';
  }, [settings, windowWidth]);
  
  const {
    data, setData, incomingData, setIncomingData, targetLocalData, projects, activeId, activeTasks,
    rootNodes, projectProgress, debugInfo, calendarTasks,
    showDebug, setShowDebug, showSidebar, setShowSidebar, showProjectMenu, setShowProjectMenu,
    showSettingsModal, setShowSettingsModal, showAllProjectsInCalendar, setShowAllProjectsInCalendar,
    collapsedNodeIds, inputTaskName, setInputTaskName, inputDateStr, setInputDateStr, activeParentId,
    menuOpenTaskId, setMenuOpenTaskId,
    addProject, importNewProject, switchProject, deleteProject, getShareUrl,
    deleteTask, updateTaskStatus, updateTaskDeadline, updateParentStatus, moveTaskOrder,
    updateTaskDetails,
    addTask, handleImportFromUrl, handleFileImport, handleAddTaskWrapper, handleTaskClick,
    handleBoardClick, handleProjectNameClick, toggleNodeExpansion, undo, redo, canUndo, canRedo, 
    sensors, handleDragEnd, customCollisionDetection,
    uploadProject, syncLimitState, resolveSyncLimit, syncState,
    handleToggleSync, handleTogglePublic, handleInviteUser, handleChangeRole, handleRemoveMember, handleToggleIncludeDataInLink,
    isCheckingShared, sharedProjectState, setSharedProjectState,
    addOrUpdateProject,
    importCloudCheck, handleCloudImportChoice, handleUpdateProjectName, forceSync
  } = useTaskOperations(boardLayout);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDropParentId, setActiveDropParentId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIOModal, setShowIOModal] = useState(false);
  const [isVerifyingProject, setIsVerifyingProject] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showUserSettingsModal, setShowUserSettingsModal] = useState(false);
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const isDev = import.meta.env.DEV;
  const isCompactSpacing = windowWidth < 1280;
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);
  const authMenuRef = useRef<HTMLDivElement>(null);

  const isCloudProject = data ? (!String(data.id).startsWith('local_') && data.isCloudSync !== false) : false;
  
  const currentUserRole = sharedProjectState?.role || data?.role || 'owner';
  const hasEditPermission = currentUserRole === 'editor' || currentUserRole === 'admin' || currentUserRole === 'owner';
  const isViewer = isCloudProject ? !hasEditPermission : false;
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner';

  useEffect(() => {
    const handler = (e: any) => setIsVerifyingProject(e.detail);
    window.addEventListener('project-verifying', handler);
    return () => window.removeEventListener('project-verifying', handler);
  }, []);

  useEffect(() => {
    const syncUserToDatabase = async () => {
      if (!isSignedIn || !user) return; 
      try {
        const token = await getToken();
        await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.username }) 
        });
      } catch (error) {
        console.error("Sync user failed:", error);
      }
    };
    syncUserToDatabase();
  }, [isSignedIn, getToken, user?.username]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) { if (authMenuRef.current && !authMenuRef.current.contains(event.target as Node)) setIsAuthMenuOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDragStart = (event: DragStartEvent) => { 
    setActiveDragId(event.active.id as string); 
    if (navigator.vibrate) navigator.vibrate(50); 
  };
  
  const handleDragMove = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      if (activeDropParentId !== null) setActiveDropParentId(null);
      return;
    }
    const overIdStr = String(over.id);
    if (overIdStr === 'root-board') {
      if (activeDropParentId !== null) setActiveDropParentId(null);
      return;
    }
    const isNestDrop = overIdStr.startsWith('nest-');
    const targetIdRaw = isNestDrop ? overIdStr.replace('nest-', '') : overIdStr;
    
    const overTask = data?.tasks?.find((t: Task) => t.id === targetIdRaw);
    if (!overTask) {
      if (activeDropParentId !== null) setActiveDropParentId(null);
      return;
    }

    const nextParentId = isNestDrop ? overTask.id : overTask.parentId;
    
    // なぜ: ドラッグ中のタスク自身、またはその子孫タスクへのドロップは不正であるため、青い枠を出さないようにする
    let currentCheckId = nextParentId;
    let isInvalidDropTarget = false;
    while (currentCheckId) {
      if (currentCheckId === active.id) {
        isInvalidDropTarget = true;
        break;
      }
      const parentTask = data?.tasks?.find((t: Task) => t.id === currentCheckId);
      currentCheckId = parentTask?.parentId;
    }

    if (isInvalidDropTarget) {
      if (activeDropParentId !== null) setActiveDropParentId(null);
      return;
    }

    if (activeDropParentId !== (nextParentId || null)) {
      setActiveDropParentId(nextParentId || null);
    }
  };

  const handleDragEndWrapper = (event: DragEndEvent) => { 
    setActiveDragId(null); 
    setActiveDropParentId(null);
    handleDragEnd(event); 
  };
  const handleDragCancel = () => { 
    setActiveDragId(null); 
    setActiveDropParentId(null);
  };

  const activeDragTask = data?.tasks?.find((t: Task) => t.id === activeDragId);

  const renderProgressBar = () => {
    const { p0, p1, p2, p3 } = projectProgressData;
    return (
      <div style={{ width: '100%', height: '4px', display: 'flex', backgroundColor: 'transparent', marginTop: '6px', zIndex: 1 }}>
        <div style={{ width: `${p2}%`, backgroundColor: 'var(--color-success)', position: 'relative', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderTopLeftRadius: '2px', borderBottomLeftRadius: '2px' }}>
          {p2 > 0 && <svg width="12" height="14" viewBox="0 0 12 14" style={{ position: 'absolute', right: -9, top: '50%', transform: 'translateY(-50%)', zIndex: 3, overflow: 'visible' }}><path d="M 0 1 L 7 7 L 0 13 Z" fill="var(--color-success)" stroke="var(--color-success)" strokeWidth="3" strokeLinejoin="round" /></svg>}
        </div>
        <div style={{ width: `${p1}%`, backgroundColor: 'var(--color-info)', position: 'relative', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderTopLeftRadius: p2 === 0 ? '2px' : '0', borderBottomLeftRadius: p2 === 0 ? '2px' : '0' }}>
          {p1 > 0 && <svg width="12" height="14" viewBox="0 0 12 14" style={{ position: 'absolute', right: -9, top: '50%', transform: 'translateY(-50%)', zIndex: 2, overflow: 'visible' }}><path d="M 0 1 L 7 7 L 0 13 Z" fill="var(--color-info)" stroke="var(--color-info)" strokeWidth="3" strokeLinejoin="round" /></svg>}
        </div>
        <div style={{ width: `${p0}%`, backgroundColor: 'var(--text-placeholder)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderTopLeftRadius: p2 === 0 && p1 === 0 ? '2px' : '0', borderBottomLeftRadius: p2 === 0 && p1 === 0 ? '2px' : '0' }} />
        <div style={{ width: `${p3}%`, backgroundColor: 'var(--color-suspend)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderTopRightRadius: '2px', borderBottomRightRadius: '2px', borderTopLeftRadius: p2 === 0 && p1 === 0 && p0 === 0 ? '2px' : '0', borderBottomLeftRadius: p2 === 0 && p1 === 0 && p0 === 0 ? '2px' : '0' }} />
      </div>
    );
  };

  const projectProgressData = useMemo(() => {
    if (!data?.tasks || data.tasks.length === 0) return { p0: 0, p1: 0, p2: 0, p3: 0 };
    const leafTasks = data.tasks.filter((t: Task) => !t.isDeleted && !data.tasks.some((child: Task) => child.parentId === t.id && !child.isDeleted));
    if (leafTasks.length === 0) return { p0: 0, p1: 0, p2: 0, p3: 0 };
    
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    let total = 0;
    leafTasks.forEach((t: Task) => { counts[t.status as 0|1|2|3]++; total++; });
    if (total === 0) return { p0: 0, p1: 0, p2: 0, p3: 0 };

    return {
      p2: (counts[2] / total) * 100, // 完了
      p1: (counts[1] / total) * 100, // 進行中
      p0: (counts[0] / total) * 100, // 未着手
      p3: (counts[3] / total) * 100  // 休止
    };
  }, [data?.tasks]);

  if (syncLimitState) {
    return <SyncLimitModal limitState={syncLimitState} onResolve={resolveSyncLimit} />;
  }

  if (isCheckingShared || isVerifyingProject) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-primary)', backgroundColor: 'var(--bg-main)' }}>
        <IconLoader size={48} />
        <p style={{ marginTop: '16px', fontSize: '1.2em' }}>{isVerifyingProject ? t('verifying_project') : t('checking_permissions')}</p>
      </div>
    );
  }

  if (!data) {
    if (sharedProjectState) {
      return (
        <SharedProjectModal 
          sharedState={sharedProjectState} onClose={() => setSharedProjectState(null)}
          onOpenAsProject={(sharedData) => { 
            setData(sharedData);
            addOrUpdateProject(sharedData); 
            switchProject(sharedData.id); 
          }}
          onMergeProject={(sharedData) => { setIncomingData(sharedData); }}
        />
      );
    }
    return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-primary)' }}>{t('loading')}</div>;
  }

  const calculateColumnWidth = (node: TaskNode, depth: number = 0): number => {
    let BASE_WIDTH = 220, INDENT_WIDTH = 24, CHAR_WIDTH_PX = 12, DEADLINE_WIDTH = 80;
    if (windowWidth <= 480) { BASE_WIDTH = 140; INDENT_WIDTH = 10; CHAR_WIDTH_PX = 7; DEADLINE_WIDTH = 50; }
    else if (windowWidth <= 768) { BASE_WIDTH = 170; INDENT_WIDTH = 16; CHAR_WIDTH_PX = 9; DEADLINE_WIDTH = 60; }
    else if (windowWidth < 1280) { BASE_WIDTH = 200; INDENT_WIDTH = 20; CHAR_WIDTH_PX = 10; DEADLINE_WIDTH = 70; }
    let len = 0; for (let i = 0; i < node.name.length; i++) len += (node.name.charCodeAt(i) < 256) ? 1 : 2;
    let max = BASE_WIDTH + (depth * INDENT_WIDTH) + Math.min(len, 20) * CHAR_WIDTH_PX + (node.deadline !== undefined ? DEADLINE_WIDTH : 0);
    if (node.children) { for (const child of node.children) max = Math.max(max, calculateColumnWidth(child, depth + 1)); }
    return max;
  };

  const renderColumnChildren = (nodes: TaskNode[], depth = 0) => {
    const content = nodes.map(n => {
      const isTargetParent = activeDropParentId === n.id;
      return (
        <React.Fragment key={n.id}>
          <SortableTaskItem id={n.id} depth={depth} disabled={isViewer}>
            <div style={{
              outline: isTargetParent ? '2px dashed var(--color-primary)' : 'none',
              outlineOffset: '2px',
              borderRadius: '4px',
              transition: 'outline 0.2s',
              backgroundColor: isTargetParent ? 'var(--bg-item-hover)' : 'transparent',
            }}>
              <TaskItem task={n} tasks={data.tasks || []} depth={depth} hasChildren={n.children.length > 0} onStatusChange={(s) => updateTaskStatus(n.id, s)} onParentStatusChange={updateParentStatus} onDelete={() => deleteTask(n.id)} onDeadlineChange={(dateStr) => updateTaskDeadline(n.id, dateStr)} isExpanded={!collapsedNodeIds.has(n.id)} onToggleExpand={() => toggleNodeExpansion(n.id)} onClick={() => handleTaskClick(n)} isMenuOpen={menuOpenTaskId === n.id} onToggleMenu={() => setMenuOpenTaskId(prev => prev === n.id ? null : n.id)} isActiveParent={activeParentId === n.id} isViewer={isViewer} onEditModalOpen={() => setEditingTask(n)} />
              {n.children.length > 0 && !collapsedNodeIds.has(n.id) && <div style={{ paddingLeft: '0px' }}>{renderColumnChildren(n.children, depth + 1)}</div>}
            </div>
          </SortableTaskItem>
        </React.Fragment>
      );
    });

    return isViewer ? <>{content}</> : <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>{content}</SortableContext>;
  };

  const renderProjectMenu = () => (
    <div style={{ position: 'relative' }}>
        <button onClick={(e) => { e.stopPropagation(); setShowProjectMenu(!showProjectMenu); }} style={{ padding: '4px', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-placeholder)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}><IconCaretDown size={12} /></button>
        {showProjectMenu && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 1000, minWidth: '200px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {projects.map((p: any) => <div key={p.id} onClick={() => { switchProject(p.id); setShowProjectMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: p.id === activeId ? 'var(--bg-surface-hover)' : 'transparent', borderBottom: '1px solid var(--border-color)', fontSize: '0.9em', color: 'var(--text-primary)' }}>{String(p.id).startsWith('local_') || p.isCloudSync === false ? '📁' : '☁️'} {p.projectName}</div>)}
                </div>
                <div onClick={() => { addProject(); setShowProjectMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--color-primary)', borderTop: '1px solid var(--border-color)', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px', borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px' }}><IconPlus size={16} /><span>{t('new_project')}</span></div>
            </div>
        )}
    </div>
  );

  const rootNodesContent = rootNodes.map(root => {
    const colWidth = calculateColumnWidth(root);
    const isTargetParent = activeDropParentId === root.id;
    return (
      <SortableTaskItem key={root.id} id={root.id} depth={0} disabled={isViewer}>
        <div style={{ 
            minWidth: boardLayout === 'vertical' ? (isMobile ? '100%' : `${colWidth}px`) : `${colWidth}px`, 
            maxWidth: boardLayout === 'vertical' ? '100%' : `${colWidth}px`, 
            width: boardLayout === 'vertical' ? (isMobile ? '100%' : 'auto') : 'auto',
            boxSizing: 'border-box',
            backgroundColor: 'var(--bg-task)', borderRadius: '8px', 
            border: isTargetParent ? '2px dashed var(--color-primary)' : '1px solid var(--border-color)',
            padding: '10px', display: 'flex', flexDirection: 'column', height: 'fit-content', cursor: isViewer ? 'default' : 'grab',
            transition: 'border 0.2s'
        }}>
            <div style={{ borderBottom: '2px solid var(--border-color)', marginBottom: '8px', paddingBottom: '4px' }}>
                <TaskItem task={root} tasks={data.tasks || []} depth={0} hasChildren={root.children.length > 0} onStatusChange={(s) => updateTaskStatus(root.id, s)} onParentStatusChange={updateParentStatus} onDelete={() => deleteTask(root.id)} onDeadlineChange={(dateStr) => updateTaskDeadline(root.id, dateStr)} isExpanded={!collapsedNodeIds.has(root.id)} onToggleExpand={() => toggleNodeExpansion(root.id)} onClick={() => handleTaskClick(root)} isMenuOpen={menuOpenTaskId === root.id} onToggleMenu={() => setMenuOpenTaskId(prev => prev === root.id ? null : root.id)} isActiveParent={activeParentId === root.id} isViewer={isViewer} onEditModalOpen={() => setEditingTask(root)} />
            </div>
            <div style={{ paddingLeft: '4px', cursor: 'auto' }}>{!collapsedNodeIds.has(root.id) && renderColumnChildren(root.children, 0)}</div>
        </div>
      </SortableTaskItem>
    );
  });

  const rightControls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
      <ProjectControls 
        onCopyLink={() => navigator.clipboard.writeText(getShareUrl()).then(() => alert(t('copy_complete')))} 
        onExport={() => { 
          const exportData = { ...data };
          delete exportData.isCloudSync; delete exportData.isPublic; delete exportData.publicRole; delete exportData.role;
          const a = document.createElement('a'); 
          a.href = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })); 
          a.download = `${data.projectName}.json`; 
          a.click(); 
        }} 
        onImport={handleFileImport} onImportFromUrl={handleImportFromUrl} showModal={showIOModal} setShowModal={setShowIOModal}
      />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <SignedIn>
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Action 
                label={t('settings')} 
                labelIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>} 
                onClick={() => setShowUserSettingsModal(true)} 
              />
              <UserButton.Action label={t('help')} labelIcon={<IconHelp size={16} />} onClick={() => setShowHelpModal(true)} />
            </UserButton.MenuItems>
          </UserButton>
        </SignedIn>
        <SignedOut>
          <div ref={authMenuRef} style={{ position: 'relative' }}>
            <button onClick={() => setIsAuthMenuOpen(!isAuthMenuOpen)} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-button)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', padding: 0 }} aria-label="アカウントメニュー"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg></button>
            {isAuthMenuOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '8px', width: '150px', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', zIndex: 1000, overflow: 'hidden' }}>
                <SignInButton mode="modal"><button onClick={() => setIsAuthMenuOpen(false)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: '0.9em', color: 'var(--text-primary)', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>{t('login')}</button></SignInButton>
                <SignUpButton mode="modal"><button onClick={() => setIsAuthMenuOpen(false)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: '0.9em', color: 'var(--text-primary)', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>{t('signup')}</button></SignUpButton>
                <button onClick={() => { setIsAuthMenuOpen(false); setShowHelpModal(true); }} style={{  width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: '0.9em', color: 'var(--text-primary)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><IconHelp size={16} /> {t('help')}</button>
              </div>
            )}
          </div>
        </SignedOut>
      </div>
    </div>
  );

  const mainAppContent = (
    <div style={{ maxWidth: '100%', margin: '0 auto', padding: isMobile ? '2px' : '20px', paddingBottom: `calc(${isMobile ? '5px' : '20px'} + env(safe-area-inset-bottom))`, paddingTop: `calc(${isMobile ? '5px' : '20px'} + env(safe-area-inset-top))`, paddingLeft: `calc(${isMobile ? '5px' : '20px'} + env(safe-area-inset-left))`, paddingRight: `calc(${isMobile ? '5px' : '20px'} + env(safe-area-inset-right))`, display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box', overflow: 'hidden' }} onClick={() => { if (showProjectMenu) setShowProjectMenu(false); }}>
      
      {showUserSettingsModal && (
        <UserSettingsModal onClose={() => setShowUserSettingsModal(false)} />
      )}

      {importCloudCheck?.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', color: 'var(--text-primary)' }}>
             <h3 style={{ marginTop: 0 }}>{t('cloud_project_detected')}</h3>
             <p style={{ fontSize: '0.95em', lineHeight: 1.5, marginBottom: '20px' }}>
                {t('cloud_project_desc_1')}<br/>{t('cloud_project_desc_2')}<br/><br/>
                <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>{t('cloud_project_cancel_desc')}</span>
             </p>
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
               <button onClick={() => handleCloudImportChoice(false)} style={{ padding: '8px 16px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>{t('cancel')}</button>
               <button onClick={() => handleCloudImportChoice(true)} style={{ padding: '8px 16px', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>{t('show_latest_data')}</button>
             </div>
          </div>
        </div>
      )}

      {showHelpModal && <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />}

      {editingTask && (
        <TaskEditModal 
          task={editingTask} hasChildren={(data.tasks || []).some((t: Task) => t.parentId === editingTask.id && !t.isDeleted)}
          onClose={() => setEditingTask(null)}
          onSave={(newName, newDateStr, newStatus) => {
            const hasChild = (data.tasks || []).some((t: Task) => t.parentId === editingTask.id && !t.isDeleted);
            const statusChanged = newStatus !== editingTask.status;
            updateTaskDetails(editingTask.id, newName, newDateStr, statusChanged ? newStatus : undefined, hasChild && statusChanged);
            setEditingTask(null);
          }}
          onDelete={() => { deleteTask(editingTask.id); setEditingTask(null); }}
          onMoveUp={() => moveTaskOrder(editingTask.id, 'up')} onMoveDown={() => moveTaskOrder(editingTask.id, 'down')}
        />
      )}

      {incomingData && targetLocalData && (
        <MergeModal 
          localData={targetLocalData} incomingData={incomingData} 
          onConfirm={(merged) => { 
            const finalMerged = { ...targetLocalData, ...merged, isCloudSync: incomingData.isCloudSync ?? targetLocalData.isCloudSync ?? merged.isCloudSync, shortId: targetLocalData.shortId || incomingData.shortId };
            setData(finalMerged); 
            if (finalMerged.id !== activeId) switchProject(finalMerged.id); 
            setIncomingData(null); 
            alert(t('merge_complete')); 
          }} 
          onCancel={() => setIncomingData(null)} onCreateNew={importNewProject} 
        />
      )}
      
      {showSettingsModal && data && (
        <ProjectSettingsModal 
          currentName={data.projectName} currentId={data.id} projects={projects} 
          isSyncEnabled={!String(data.id).startsWith('local_') && data.isCloudSync !== false}
          isPublic={!!data.isPublic}
          includeDataInLink={!!(data as any).includeDataInLink}
          members={data.members || []} isAdmin={isAdmin} currentUserRole={currentUserRole}
          isCloudProject={isCloudProject} syncState={syncState}
          onClose={() => setShowSettingsModal(false)} onSaveName={(newName) => { handleUpdateProjectName(newName); }} 
          onToggleSync={handleToggleSync} onTogglePublic={handleTogglePublic} 
          onToggleIncludeDataInLink={handleToggleIncludeDataInLink}
          onInviteUser={handleInviteUser}
          onChangeRole={handleChangeRole} onRemoveMember={handleRemoveMember}
          onDeleteProject={(isCloudDelete) => { deleteProject(data.id, isCloudDelete); setShowSettingsModal(false); }}
        />
      )}
      
      {showAddModal && <TaskAddModal taskName={inputTaskName} setTaskName={setInputTaskName} dateStr={inputDateStr} setDateStr={setInputDateStr} activeTasks={activeTasks} initialParentId={activeParentId} onSubmit={(parentId) => handleAddTaskWrapper(parentId)} onClose={() => setShowAddModal(false)} />}

      <header style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexShrink: 0, marginBottom: isCompactSpacing ? '5px' : '10px', gap: isMobile ? '10px' : '5px' , padding: isMobile ? '10px':'0px' , paddingBottom: '0px', width: '100%', boxSizing: 'border-box' }}>
          {isMobile ? (
              <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <button onClick={() => setShowSidebar(!showSidebar)} style={{ padding: '8px', backgroundColor: showSidebar ? 'var(--color-primary)' : 'var(--bg-button)', color: showSidebar ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px' }}><IconCalendar size={20} /></button>
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '1.2em', fontWeight: 'bold', textDecoration: 'underline dotted', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={handleProjectNameClick}>
                                    <FormattedProjectName name={data.projectName} />
                                  </span>
                                  {renderProjectMenu()}
                                  
                                  {isSignedIn && isCloudProject && (syncState === 'waiting' || syncState === 'syncing') ? (
                                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }} title={t('syncing')}><IconLoader size={16} /></div>
                                  ) : isSignedIn && isCloudProject && syncState === 'error' ? (
                                    <button onClick={(e) => { e.stopPropagation(); forceSync(); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }} title={t('sync_error')}><IconError size={16} /></button>
                                  ) : isSignedIn && !isCloudProject ? (
                                    <button onClick={() => uploadProject(data.id)} style={{ background: 'var(--bg-button)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('save_to_cloud')}><IconCloudUpload size={16} /></button>
                                  ) : isSignedIn && isCloudProject && syncState === 'synced' ? (
                                    <button onClick={(e) => { e.stopPropagation(); forceSync(); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--color-primary)', padding: 0 }} title={t('synced')}><IconCheckCircle size={16} /></button>
                                  ) : null}
                              </div>
                          </div>
                      </div>
                      {rightControls}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingLeft: '44px', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '10px' }}>
                          <span style={{ color: 'yellowgreen', fontSize: '0.9em', fontWeight: 'bold' }}>({t('total_progress')}: {projectProgress}%)</span>
                          {renderProgressBar()}
                      </div>
                      {isNarrowLayout && showSidebar && (
                        <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span>{t('all_projects')}</span>
                          <div className="toggle-switch"><input type="checkbox" checked={showAllProjectsInCalendar} onChange={(e) => setShowAllProjectsInCalendar(e.target.checked)} /><span className="slider"></span></div>
                        </label>
                      )}
                  </div>
              </>
          ) : (
              <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                      <button onClick={() => setShowSidebar(!showSidebar)} style={{ padding: '8px', backgroundColor: showSidebar ? 'var(--color-primary)' : 'var(--bg-button)', color: showSidebar ? '#fff' : 'var(--text-primary)', border: 'none', borderRadius: '4px' }}><IconCalendar size={20} /></button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          <h1 style={{ margin: 0, fontSize: '1.5em', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={handleProjectNameClick}>
                            <span style={{ textDecoration: 'underline dotted' }}><FormattedProjectName name={data.projectName} /></span>
                          </h1>
                          {renderProjectMenu()}
                          
                          {isSignedIn && isCloudProject && (syncState === 'waiting' || syncState === 'syncing') ? (
                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px', color: 'var(--text-secondary)' }} title={t('syncing')}><IconLoader size={18} /></div>
                          ) : isSignedIn && isCloudProject && syncState === 'error' ? (
                            <button onClick={(e) => { e.stopPropagation(); forceSync(); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '4px', padding: 0 }} title={t('sync_error')}><IconError size={18} /></button>
                          ) : isSignedIn && !isCloudProject ? (
                            <button onClick={() => uploadProject(data.id)} style={{ background: 'var(--bg-button)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.85em', fontWeight: 'bold' }} title={t('save_to_cloud')}><IconCloudUpload size={16} /> {t('save')}</button>
                          ) : isSignedIn && isCloudProject && syncState === 'synced' ? (
                            <button onClick={(e) => { e.stopPropagation(); forceSync(); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '4px', color: 'var(--color-primary)', padding: 0 }} title={t('synced')}><IconCheckCircle size={18} /></button>
                          ) : null}

                          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '10px', minWidth: '150px' }}>
                              <span style={{ color: 'yellowgreen', fontSize: '1.2em', fontWeight: 'bold' }}>({t('total_progress')}: {projectProgress}%)</span>
                              {renderProgressBar()}
                          </div>

                          {isNarrowLayout && showSidebar && (
                            <label style={{ marginLeft: 'auto', fontSize: '0.85em', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{t('all_projects')}</span>
                              <div className="toggle-switch"><input type="checkbox" checked={showAllProjectsInCalendar} onChange={(e) => setShowAllProjectsInCalendar(e.target.checked)} /><span className="slider"></span></div>
                            </label>
                          )}
                      </div>
                  </div>
                  {rightControls}
              </>
          )}
      </header>

      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', gap: (showSidebar && !isMobile) ? '23px' : '0' }}>
        <div style={{ flex: showSidebar ? (isMobile ? '1 0 100%' : '0 0 35%') : '0 0 0px', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'flex 0.3s ease, opacity 0.3s ease', opacity: showSidebar ? 1 : 0, pointerEvents: showSidebar ? 'auto' : 'none', height: '100%', minWidth: showSidebar ? (isMobile ? '100%' : '300px') : '0' }}>
            {!isNarrowLayout && (
              <div style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, marginBottom: isMobile ? '0px' : '21px' }}>
                <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{t('all_projects')}</span>
                  <div className="toggle-switch"><input type="checkbox" checked={showAllProjectsInCalendar} onChange={(e) => setShowAllProjectsInCalendar(e.target.checked)} /><span className="slider"></span></div>
                </label>
              </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0px' }}>
              <TaskCalendar 
                tasks={calendarTasks} 
                activeTasks={activeTasks}
                onStatusChange={isViewer ? () => {} : updateTaskStatus} 
                onParentStatusChange={isViewer ? () => {} : updateParentStatus} 
                onAddTask={(name, dateStr, parentId) => addTask(name, dateStr, null, parentId)}
              />
            </div>
        </div>

        <div style={{ flex: 1, display: (isMobile && showSidebar) ? 'none' : 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!isMobile && !isViewer && <div style={{ marginBottom: '0px', flexShrink: 0 }}><TaskInput taskName={inputTaskName} setTaskName={setInputTaskName} dateStr={inputDateStr} setDateStr={setInputDateStr} onSubmit={() => handleAddTaskWrapper()} /></div>}
          
          {isViewer ? (
            <StaticBoardArea activeTasks={activeTasks} onBoardClick={handleBoardClick} isMobile={isMobile} isNarrowLayout={isNarrowLayout} onShowIOModal={() => setShowIOModal(true)} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} boardLayout={boardLayout}>
              <>{rootNodesContent}</>
            </StaticBoardArea>
          ) : (
            <InteractiveBoardArea activeTasks={activeTasks} onBoardClick={handleBoardClick} isMobile={isMobile} isNarrowLayout={isNarrowLayout} onShowAddModal={() => setShowAddModal(true)} onShowIOModal={() => setShowIOModal(true)} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} boardLayout={boardLayout}>
              <SortableContext items={rootNodes.map(r => r.id)} strategy={boardLayout === 'vertical' ? verticalListSortingStrategy : horizontalListSortingStrategy}>
                  {rootNodesContent}
              </SortableContext>
            </InteractiveBoardArea>
          )}

          {!isMobile && (
            <div style={{ marginTop: '10px', flexShrink: 0 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '32px' }}>
                {isDev && <button onClick={() => setShowDebug(!showDebug)} style={{ fontSize: '0.7em', color: 'var(--text-placeholder)', background: 'transparent', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }} >{showDebug ? t('hide_debug') : t('show_debug')}</button>}
                <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', gap: '15px' }}>
                  <button disabled={!canUndo} onClick={undo} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: canUndo ? 'pointer' : 'default', padding: '4px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', opacity: canUndo ? 1 : 0.4 }}><IconUndo size={18} /></button>
                  <button disabled={!canRedo} onClick={redo} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: canRedo ? 'pointer' : 'default', padding: '4px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', opacity: canRedo ? 1 : 0.4 }}><IconRedo size={18} /></button>
                </div>
              </div>
              {isDev && showDebug && <div style={{ marginTop: '15px', padding: '15px', background: 'var(--bg-button)', borderRadius: '8px', fontSize: '0.75em', color: 'var(--text-secondary)', maxHeight: '400px', overflowY: 'auto' }}><p><b>{t('project_name')}:</b> {data.projectName}</p><p><b>{t('applied_mapping')}</b> <span style={{ color: 'var(--color-info)' }}>{debugInfo.mappingInfo}</span></p></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      {sharedProjectState && (
        <SharedProjectModal 
          sharedState={sharedProjectState} onClose={() => setSharedProjectState(null)}
          onOpenAsProject={(sharedData) => { 
            setData(sharedData);
            addOrUpdateProject(sharedData); 
            switchProject(sharedData.id); 
          }}
          onMergeProject={(sharedData) => { setIncomingData(sharedData); }}
        />
      )}

      {isViewer ? (
        <DndContext>
          {mainAppContent}
        </DndContext>
      ) : (
        <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEndWrapper} onDragCancel={handleDragCancel} autoScroll={!isMobile} >
          {mainAppContent}
          <DragOverlay dropAnimation={null}>
            {activeDragTask ? (
              <div style={{ backgroundColor: 'var(--bg-task)', borderRadius: '8px', border: '1px solid var(--color-primary)', padding: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', opacity: 0.9, cursor: 'grabbing', minWidth: '220px', width: 'max-content', maxWidth: '90vw' }}>
                <TaskItem task={activeDragTask} tasks={data.tasks || []} depth={0} hasChildren={(data.tasks || []).some((t: Task) => t.parentId === activeDragTask.id && !t.isDeleted)} onStatusChange={() => {}} onParentStatusChange={() => {}} onDelete={() => {}} onDeadlineChange={() => {}} isExpanded={false} onToggleExpand={() => {}} onClick={() => {}} isMenuOpen={false} onToggleMenu={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  );
}

export default App;