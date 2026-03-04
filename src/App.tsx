// 役割: アプリケーションのメインエントリーおよび全体のUIレイアウト・状態管理
// なぜ: ドラッグ＆ドロップや認証、メインボードの描画など主要機能を集約するため

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  DndContext, 
  useDroppable,
  DragOverlay,
  useDndMonitor,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth, useUser } from "@clerk/clerk-react";

import { useTaskOperations } from './hooks/useTaskOperations';
import { useResponsive } from './hooks/useResponsive';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { ProjectControls } from './components/ProjectControls';
import { TaskCalendar } from './components/TaskCalendar';
import type { Task, AppData } from './types';
import { MergeModal } from './components/MergeModal';
import { SortableTaskItem } from './components/SortableTaskItem';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { TaskAddModal } from './components/TaskAddModal';
import { IconUndo, IconRedo, IconCalendar, IconCaretDown, IconPlus, IconInputOutput } from './components/Icons';
import { SharedProjectModal } from './components/SharedProjectModal';
import { HelpModal } from './components/HelpModal';
import { TaskEditModal } from './components/TaskEditModal';

type TaskNode = Task & { children: TaskNode[] };

const IconHelp = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const IconCloudUpload = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 19C19.985 19 22 16.985 22 14.5C22 12.164 20.228 10.235 17.957 10.024C17.447 6.6 14.526 4 11 4C7.134 4 4 7.134 4 11C4 11.233 4.011 11.462 4.032 11.687C1.782 12.083 0 14.075 0 16.5C0 19.538 2.462 22 5.5 22H17.5Z"/>
    <path d="M12 17V10"/>
    <path d="M9 13L12 10L15 13"/>
  </svg>
);

const IconLoader = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const IconCheckCircle = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const getCharWidth = (str: string) => {
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if ((c >= 0x0 && c <= 0x7f) || (c >= 0xff61 && c <= 0xff9f)) width += 1;
    else width += 2;
  }
  return width;
};

const getCharClass = (c: string) => {
  if (/[ \-_/.=　]/.test(c)) return 'symbol';
  if (/[a-zａ-ｚ]/.test(c)) return 'lower';
  if (/[A-ZＡ-Ｚ]/.test(c)) return 'upper';
  if (/[0-9０-９]/.test(c)) return 'num';
  if (/[\u3040-\u309F]/.test(c)) return 'hiragana';
  if (/[\u30A0-\u30FF\uFF65-\uFF9F]/.test(c)) return 'katakana';
  if (/[\u4E00-\u9FFF]/.test(c)) return 'kanji';
  return 'other';
};

const getCharGroup = (charClass: string) => {
  if (['lower', 'upper'].includes(charClass)) return 'alpha';
  if (charClass === 'num') return 'num';
  if (['hiragana', 'katakana', 'kanji'].includes(charClass)) return 'japanese';
  if (charClass === 'symbol') return 'symbol';
  return 'other';
};

const FormattedProjectName = ({ name }: { name: string }) => {
  const totalWidth = getCharWidth(name);
  if (totalWidth <= 20) return <>{name}</>;

  const breakpoints: { index: number, score: number, width: number }[] = [];
  const widthAt: number[] = [];
  let currentWidth = 0;
  
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    currentWidth += ((c >= 0x0 && c <= 0x7f) || (c >= 0xff61 && c <= 0xff9f)) ? 1 : 2;
    widthAt[i] = currentWidth;
    
    if (i > 0) {
      const prev = name[i - 1];
      const curr = name[i];
      
      const prevClass = getCharClass(prev);
      const currClass = getCharClass(curr);
      const prevGroup = getCharGroup(prevClass);
      const currGroup = getCharGroup(currClass);

      let baseScore = 0;

      if (prevGroup === 'symbol' && currGroup !== 'symbol') {
        baseScore = 120;
      } else if (prevGroup !== currGroup && prevGroup !== 'symbol' && currGroup !== 'symbol') {
        baseScore = 100;
      } else if (prevGroup !== 'symbol' && currGroup === 'symbol') {
        baseScore = 90;
      } else if (prevGroup === currGroup && prevClass !== currClass) {
        if (prevClass === 'lower' && currClass === 'upper') {
          baseScore = 60;
        } else if (prevGroup === 'japanese') {
          baseScore = 40;
        }
      }

      if (baseScore > 0) {
        breakpoints.push({ index: i, score: baseScore, width: widthAt[i - 1] });
      }
    }
  }

  let bestPoint = -1;
  const targetWidth = totalWidth / 2;
  
  const validBreakpoints = breakpoints.filter(bp => {
    const w1 = bp.width;
    const w2 = totalWidth - w1;
    return w1 <= 20 && w2 <= 20;
  });

  if (validBreakpoints.length > 0) {
    let maxFinalScore = -Infinity;
    
    for (const bp of validBreakpoints) {
      const distanceRatio = Math.abs(targetWidth - bp.width) / targetWidth;
      const penalty = distanceRatio * 40;
      const finalScore = bp.score - penalty;
      
      if (finalScore > maxFinalScore) {
        maxFinalScore = finalScore;
        bestPoint = bp.index;
      }
    }
  } else {
    for (let i = 0; i < name.length; i++) {
      if (widthAt[i] > 20) {
        bestPoint = i;
        break;
      }
    }
    if (bestPoint === -1) {
      bestPoint = Math.floor(name.length / 2);
    }
  }

  const line1 = name.substring(0, bestPoint);
  const line2 = name.substring(bestPoint);

  return (
    <span style={{ display: 'inline-block', lineHeight: '1.3', textAlign: 'left', verticalAlign: 'middle' }}>
      {line1}<br/>{line2}
    </span>
  );
};

const SyncLimitModal = ({ limitState, onResolve }: { limitState: any, onResolve: (ids: string[]) => void }) => {
  const [selected, setSelected] = useState<string[]>([]);
  
  const toggle = (id: string) => {
     if (selected.includes(id)) setSelected(prev => prev.filter(x => x !== id));
     else if (selected.length < limitState.limit) setSelected(prev => [...prev, id]);
  };

  return (
     <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{background: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', maxWidth: '500px', width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.5)'}}>
           <h3 style={{ color: 'var(--color-danger-text)', marginTop: 0 }}>⚠️ クラウド同期の上限を超えています</h3>
           <p style={{ color: 'var(--text-primary)', fontSize: '0.95em', lineHeight: 1.5 }}>現在のプランの同期上限は <strong>{limitState.limit}件</strong> ですが、クラウド上に {limitState.cloudProjects.length}件 のデータが見つかりました。</p>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.85em', marginBottom: '20px' }}>同期を継続するプロジェクトを {limitState.limit}件 選んでください。（選ばれなかったものはオフラインのローカルデータに切り替わります）</p>
           
           <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', marginBottom: '20px'}}>
              {limitState.cloudProjects.map((p: any) => (
                 <label key={p.id} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', opacity: (!selected.includes(p.id) && selected.length >= limitState.limit) ? 0.5 : 1}}>
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} disabled={!selected.includes(p.id) && selected.length >= limitState.limit} style={{ transform: 'scale(1.2)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>{p.projectName}</span>
                 </label>
              ))}
           </div>
           
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ fontSize: '0.9em', color: selected.length === limitState.limit ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
                選択中: {selected.length} / {limitState.limit}件
             </span>
             <button onClick={() => onResolve(selected)} disabled={selected.length === 0} style={{ padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: selected.length === 0 ? 'not-allowed' : 'pointer', opacity: selected.length === 0 ? 0.5 : 1 }}>決定する</button>
           </div>
        </div>
     </div>
  );
};

function usePanning(isMobile: boolean, isDragging: boolean, onBoardClick: () => void) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });
  const hasMovedRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => { 
    if (isMobile || isDragging || e.button !== 0) return; 
    if ((e.target as Element).closest('[data-task-id]')) return; 
    setIsPanning(true); 
    hasMovedRef.current = false; 
    setStartPos({ x: e.clientX, y: e.clientY }); 
    if (scrollRef.current) setScrollPos({ left: scrollRef.current.scrollLeft, top: scrollRef.current.scrollTop }); 
    (e.target as Element).setPointerCapture(e.pointerId); 
  }, [isMobile, isDragging]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => { 
    if (!isPanning || !scrollRef.current) return; 
    const dx = e.clientX - startPos.x; 
    const dy = e.clientY - startPos.y; 
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMovedRef.current = true; 
    scrollRef.current.scrollLeft = scrollPos.left - dx; 
    scrollRef.current.scrollTop = scrollPos.top - dy; 
  }, [isPanning, startPos, scrollPos]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => { 
    if (!isPanning) return; 
    setIsPanning(false); 
    (e.target as Element).releasePointerCapture(e.pointerId); 
  }, [isPanning]);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => { 
    if (!isPanning) return; 
    setIsPanning(false); 
    (e.target as Element).releasePointerCapture(e.pointerId); 
  }, [isPanning]);

  const handleClick = useCallback(() => {
    if (!hasMovedRef.current) onBoardClick();
  }, [onBoardClick]);

  return { scrollRef, isPanning, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleClick };
}

const InteractiveBoardArea = ({ children, activeTasks, onBoardClick, isMobile, isNarrowLayout, onShowAddModal, onShowIOModal, onUndo, onRedo, canUndo, canRedo }: any) => { 
  const { setNodeRef, isOver } = useDroppable({ id: 'root-board' });
  const [isDragging, setIsDragging] = useState(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  useDndMonitor({ onDragStart: () => setIsDragging(true), onDragEnd: () => setIsDragging(false), onDragCancel: () => setIsDragging(false) });
  
  const { scrollRef, isPanning, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleClick } = usePanning(isMobile, isDragging, onBoardClick);
  const setRef = useCallback((node: HTMLDivElement | null) => { setNodeRef(node); scrollRef.current = node; }, [setNodeRef, scrollRef]);

  useEffect(() => {
    if (!isDragging || !isMobile) return;
    const updatePointer = (x: number, y: number) => { pointerRef.current = { x, y }; };
    const handleTouchMove = (e: TouchEvent) => { if (e.touches.length > 0) updatePointer(e.touches[0].clientX, e.touches[0].clientY); };
    const handlePointerMoveGlobal = (e: PointerEvent) => { updatePointer(e.clientX, e.clientY); };
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('pointermove', handlePointerMoveGlobal);
    let animationFrameId: number;
    const tick = () => {
      if (scrollRef.current) {
        const rect = scrollRef.current.getBoundingClientRect();
        const ratioX = (pointerRef.current.x - (rect.left + rect.width / 2)) / (rect.width / 2);
        const ratioY = (pointerRef.current.y - (rect.top + rect.height / 2)) / (rect.height / 2);
        if (Math.abs(ratioX) > 0.4) scrollRef.current.scrollLeft += Math.sign(ratioX) * ((Math.abs(ratioX) - 0.4) / 0.6) * 15;
        if (Math.abs(ratioY) > 0.4) scrollRef.current.scrollTop += Math.sign(ratioY) * ((Math.abs(ratioY) - 0.4) / 0.6) * 15;
      }
      animationFrameId = requestAnimationFrame(tick);
    };
    tick();
    return () => { window.removeEventListener('touchmove', handleTouchMove); window.removeEventListener('pointermove', handlePointerMoveGlobal); cancelAnimationFrame(animationFrameId); };
  }, [isDragging, isMobile]);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '200px', border: isOver ? '2px dashed var(--color-primary)' : '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', transition: 'border 0.2s', overflow: 'hidden' }}>
      <div ref={setRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel} onClick={handleClick} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', display: 'flex', gap: isMobile ? '8px' : '16px', alignItems: 'flex-start', padding: isMobile ? '8px' : '16px', cursor: isPanning ? 'grabbing' : (isMobile ? 'default' : 'grab'), userSelect: isPanning ? 'none' : 'auto' }}>
        {activeTasks.length === 0 ? <p style={{ color: 'var(--text-secondary)', margin: 'auto' }}>タスクを追加してください</p> : children}
      </div>
      {isMobile && !isDragging && (
        <>
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '10px', zIndex: 100 }}>
            <button disabled={!canUndo} onClick={(e) => { e.stopPropagation(); onUndo(); }} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: canUndo ? 'pointer' : 'default', opacity: canUndo ? 1 : 0.4 }}><IconUndo size={20} /></button>
            <button disabled={!canRedo} onClick={(e) => { e.stopPropagation(); onRedo(); }} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: canRedo ? 'pointer' : 'default', opacity: canRedo ? 1 : 0.4 }}><IconRedo size={20} /></button>
          </div>
          <div style={{ position: 'absolute', bottom: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 100 }}>
            {isNarrowLayout && (
              <button onClick={(e) => { e.stopPropagation(); onShowIOModal(); }} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85, cursor: 'pointer' }}><IconInputOutput size={20} /></button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onShowAddModal(); }} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85, cursor: 'pointer' }}><IconPlus size={28} /></button>
          </div>
        </>
      )}
    </div>
  );
};

const StaticBoardArea = ({ children, activeTasks, onBoardClick, isMobile, isNarrowLayout, onShowIOModal, onUndo, onRedo, canUndo, canRedo }: any) => { 
  const { scrollRef, isPanning, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleClick } = usePanning(isMobile, false, onBoardClick);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '200px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', transition: 'border 0.2s', overflow: 'hidden' }}>
      <div ref={scrollRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel} onClick={handleClick} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', display: 'flex', gap: isMobile ? '8px' : '16px', alignItems: 'flex-start', padding: isMobile ? '8px' : '16px', cursor: isPanning ? 'grabbing' : (isMobile ? 'default' : 'grab'), userSelect: isPanning ? 'none' : 'auto' }}>
        {activeTasks.length === 0 ? <p style={{ color: 'var(--text-secondary)', margin: 'auto' }}>タスクがありません</p> : children}
      </div>
      {isMobile && (
        <>
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '10px', zIndex: 100 }}>
            <button disabled={!canUndo} onClick={(e) => { e.stopPropagation(); onUndo(); }} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: canUndo ? 'pointer' : 'default', opacity: canUndo ? 1 : 0.4 }}><IconUndo size={20} /></button>
            <button disabled={!canRedo} onClick={(e) => { e.stopPropagation(); onRedo(); }} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: canRedo ? 'pointer' : 'default', opacity: canRedo ? 1 : 0.4 }}><IconRedo size={20} /></button>
          </div>
          {isNarrowLayout && (
            <div style={{ position: 'absolute', bottom: '16px', right: '16px', display: 'flex', alignItems: 'center', zIndex: 100 }}>
              <button onClick={(e) => { e.stopPropagation(); onShowIOModal(); }} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85, cursor: 'pointer' }}><IconInputOutput size={20} /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

function App() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  
  const {
    data, setData, incomingData, setIncomingData, targetLocalData, projects, activeId, activeTasks,
    rootNodes, projectProgress, debugInfo, calendarTasks,
    showDebug, setShowDebug, showSidebar, setShowSidebar, showProjectMenu, setShowProjectMenu,
    showSettingsModal, setShowSettingsModal, showAllProjectsInCalendar, setShowAllProjectsInCalendar,
    collapsedNodeIds, inputTaskName, setInputTaskName, inputDateStr, setInputDateStr, activeParentId,
    menuOpenTaskId, setMenuOpenTaskId,
    addProject, importNewProject, switchProject, deleteProject, getShareUrl,
    deleteTask, renameTask, updateTaskStatus, updateTaskDeadline, updateParentStatus,
    handleImportFromUrl, handleFileImport, handleAddTaskWrapper, handleTaskClick,
    handleBoardClick, handleProjectNameClick, toggleNodeExpansion, undo, redo, canUndo, canRedo, 
    sensors, handleDragEnd, customCollisionDetection,
    uploadProject, syncLimitState, resolveSyncLimit, syncState,
    handleToggleSync, handleTogglePublic, handleInviteUser, handleChangeRole, handleRemoveMember,
    isCheckingShared, sharedProjectState, setSharedProjectState,
    addOrUpdateProject,
    importCloudCheck, handleCloudImportChoice, handleUpdateProjectName
  } = useTaskOperations();

  const { windowWidth, isMobile, isNarrowLayout } = useResponsive();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIOModal, setShowIOModal] = useState(false);
  const [isVerifyingProject, setIsVerifyingProject] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
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
    console.log('[Permission Check]', {
      role: currentUserRole,
      isViewer,
      isAdmin,
      isCloudProject,
      isShared: !!sharedProjectState,
      hasEditPermission,
      dataRole: data?.role
    });
  }, [currentUserRole, isViewer, isAdmin, isCloudProject, sharedProjectState, hasEditPermission, data?.role]);

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
  const handleDragEndWrapper = (event: DragEndEvent) => { setActiveDragId(null); handleDragEnd(event); };
  const handleDragCancel = () => { setActiveDragId(null); };

  const moveTaskOrder = (taskId: string, direction: 'up' | 'down') => {
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
      setData({ ...data, tasks: newTasks });
    } else if (direction === 'down' && siblingIndex < siblings.length - 1) {
      const target = siblings[siblingIndex + 1];
      const newTasks = [...data.tasks];
      const tIndex = newTasks.findIndex((t: Task) => t.id === taskToMove.id);
      const targetIndex = newTasks.findIndex((t: Task) => t.id === target.id);
      const temp = newTasks[tIndex].order;
      newTasks[tIndex] = { ...newTasks[tIndex], order: newTasks[targetIndex].order };
      newTasks[targetIndex] = { ...newTasks[targetIndex], order: temp };
      setData({ ...data, tasks: newTasks });
    }
  };

  const activeDragTask = data?.tasks?.find((t: Task) => t.id === activeDragId);

  const overallProgressData = useMemo(() => {
    if (!data?.tasks || data.tasks.length === 0) return { p0: 0, p1: 0, p2: 0, p3: 0 };
    const leafTasks = data.tasks.filter((t: Task) => !t.isDeleted && !data.tasks.some((child: Task) => child.parentId === t.id && !child.isDeleted));
    if (leafTasks.length === 0) return { p0: 0, p1: 0, p2: 0, p3: 0 };
    
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    let total = 0;
    leafTasks.forEach((t: Task) => {
      counts[t.status as 0|1|2|3]++;
      total++;
    });
    if (total === 0) return { p0: 0, p1: 0, p2: 0, p3: 0 };

    return {
      p2: (counts[2] / total) * 100, // 完了
      p1: (counts[1] / total) * 100, // 進行中
      p0: (counts[0] / total) * 100, // 未着手
      p3: (counts[3] / total) * 100  // 休止
    };
  }, [data?.tasks]);

  const renderProgressBar = () => {
    const { p0, p1, p2, p3 } = overallProgressData;
    return (
      <div style={{ width: '100%', height: '4px', display: 'flex', backgroundColor: 'transparent', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
        <div style={{ width: `${p2}%`, backgroundColor: 'var(--color-success)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        <div style={{ width: `${p1}%`, backgroundColor: 'var(--color-info)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        <div style={{ width: `${p0}%`, backgroundColor: 'var(--text-placeholder)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        <div style={{ width: `${p3}%`, backgroundColor: 'var(--color-suspend)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </div>
    );
  };

  if (syncLimitState) {
    return <SyncLimitModal limitState={syncLimitState} onResolve={resolveSyncLimit} />;
  }

  if (isCheckingShared || isVerifyingProject) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-primary)', backgroundColor: 'var(--bg-main)' }}>
        <IconLoader size={48} />
        <p style={{ marginTop: '16px', fontSize: '1.2em' }}>{isVerifyingProject ? 'プロジェクトを検証中...' : 'プロジェクトの権限を確認中...'}</p>
      </div>
    );
  }

  if (!data) return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-primary)' }}>Loading...</div>;

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
    const content = nodes.map(n => (
      <React.Fragment key={n.id}>
        <SortableTaskItem id={n.id} depth={depth} disabled={isViewer}>
            <TaskItem task={n} tasks={data.tasks || []} depth={depth} hasChildren={n.children.length > 0} onStatusChange={(s) => updateTaskStatus(n.id, s)} onParentStatusChange={updateParentStatus} onDelete={() => deleteTask(n.id)} onDeadlineChange={(dateStr) => updateTaskDeadline(n.id, dateStr)} isExpanded={!collapsedNodeIds.has(n.id)} onToggleExpand={() => toggleNodeExpansion(n.id)} onClick={() => handleTaskClick(n)} isMenuOpen={menuOpenTaskId === n.id} onToggleMenu={() => setMenuOpenTaskId(prev => prev === n.id ? null : n.id)} isActiveParent={activeParentId === n.id} isViewer={isViewer} onEditModalOpen={() => setEditingTask(n)} />
            {n.children.length > 0 && !collapsedNodeIds.has(n.id) && <div style={{ paddingLeft: '0px' }}>{renderColumnChildren(n.children, depth + 1)}</div>}
        </SortableTaskItem>
      </React.Fragment>
    ));

    return isViewer ? (
      <>{content}</>
    ) : (
      <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
        {content}
      </SortableContext>
    );
  };

  const renderProjectMenu = () => (
    <div style={{ position: 'relative' }}>
        <button onClick={(e) => { e.stopPropagation(); setShowProjectMenu(!showProjectMenu); }} style={{ padding: '4px', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-placeholder)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}><IconCaretDown size={12} /></button>
        {showProjectMenu && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 1000, minWidth: '200px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {projects.map((p: AppData) => <div key={p.id} onClick={() => { switchProject(p.id); setShowProjectMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: p.id === activeId ? 'var(--bg-surface-hover)' : 'transparent', borderBottom: '1px solid var(--border-color)', fontSize: '0.9em', color: 'var(--text-primary)' }}>{String(p.id).startsWith('local_') || p.isCloudSync === false ? '📁' : '☁️'} {p.projectName}</div>)}
                </div>
                <div onClick={() => { addProject(); setShowProjectMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--color-primary)', borderTop: '1px solid var(--border-color)', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px', borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px' }}><IconPlus size={16} /><span>新規プロジェクト</span></div>
            </div>
        )}
    </div>
  );

  const rootNodesContent = rootNodes.map(root => {
    const colWidth = calculateColumnWidth(root);
    return (
      <SortableTaskItem key={root.id} id={root.id} depth={0} disabled={isViewer}>
        <div style={{ minWidth: `${colWidth}px`, maxWidth: `${colWidth}px`, backgroundColor: 'var(--bg-task)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px', display: 'flex', flexDirection: 'column', height: 'fit-content', cursor: isViewer ? 'default' : 'grab' }}>
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
        onCopyLink={() => navigator.clipboard.writeText(getShareUrl()).then(() => alert('コピー完了'))} 
        onExport={() => { 
          const exportData = { ...data };
          delete exportData.isCloudSync;
          delete exportData.isPublic;
          delete exportData.publicRole;
          delete exportData.role;
          const a = document.createElement('a'); 
          a.href = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })); 
          a.download = `${data.projectName}.json`; 
          a.click(); 
        }} 
        onImport={handleFileImport} 
        onImportFromUrl={handleImportFromUrl} 
        showModal={showIOModal}
        setShowModal={setShowIOModal}
      />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <SignedIn>
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Action 
                label="ヘルプ" 
                labelIcon={<IconHelp size={16} />} 
                onClick={() => setShowHelpModal(true)} 
              />
            </UserButton.MenuItems>
          </UserButton>
        </SignedIn>
        <SignedOut>
          <div ref={authMenuRef} style={{ position: 'relative' }}>
            <button onClick={() => setIsAuthMenuOpen(!isAuthMenuOpen)} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-button)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', padding: 0 }} aria-label="アカウントメニュー"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg></button>
            {isAuthMenuOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '8px', width: '150px', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', zIndex: 1000, overflow: 'hidden' }}>
                <SignInButton mode="modal"><button onClick={() => setIsAuthMenuOpen(false)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: '0.9em', color: 'var(--text-primary)', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>ログイン</button></SignInButton>
                <SignUpButton mode="modal"><button onClick={() => setIsAuthMenuOpen(false)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: '0.9em', color: 'var(--text-primary)', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>新規登録</button></SignUpButton>
                <button onClick={() => { setIsAuthMenuOpen(false); setShowHelpModal(true); }} style={{  width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: '0.9em', color: 'var(--text-primary)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconHelp size={16} /> ヘルプ
                </button>
              </div>
            )}
          </div>
        </SignedOut>
      </div>
    </div>
  );

  const mainAppContent = (
    <div style={{ maxWidth: '100%', margin: '0 auto', padding: isMobile ? '2px' : '20px', paddingBottom: `calc(${isMobile ? '5px' : '20px'} + env(safe-area-inset-bottom))`, paddingTop: `calc(${isMobile ? '5px' : '20px'} + env(safe-area-inset-top))`, paddingLeft: `calc(${isMobile ? '5px' : '20px'} + env(safe-area-inset-left))`, paddingRight: `calc(${isMobile ? '5px' : '20px'} + env(safe-area-inset-right))`, display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box', overflow: 'hidden' }} onClick={() => { if (showProjectMenu) setShowProjectMenu(false); }}>
      
      {/* ★ クラウドインポート確認モーダル */}
      {importCloudCheck?.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', color: 'var(--text-primary)' }}>
             <h3 style={{ marginTop: 0 }}>クラウドプロジェクトの検出</h3>
             <p style={{ fontSize: '0.95em', lineHeight: 1.5, marginBottom: '20px' }}>
               このプロジェクトはクラウド上に存在します。<br/>
               クラウドの最新データを表示しますか？<br/><br/>
               <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>（[キャンセル]を選択すると、読み込んだJSONデータを表示・マージします）</span>
             </p>
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
               <button onClick={() => handleCloudImportChoice(false)} style={{ padding: '8px 16px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>キャンセル</button>
               <button onClick={() => handleCloudImportChoice(true)} style={{ padding: '8px 16px', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>最新データを表示</button>
             </div>
          </div>
        </div>
      )}

      {showHelpModal && <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />}

      {editingTask && (
        <TaskEditModal 
          task={editingTask}
          hasChildren={(data.tasks || []).some((t: Task) => t.parentId === editingTask.id && !t.isDeleted)}
          onClose={() => setEditingTask(null)}
          onSave={(newName, newDateStr, newStatus) => {
            if (newName.trim() !== editingTask.name) renameTask(editingTask.id, newName);
            updateTaskDeadline(editingTask.id, newDateStr);
            
            if (newStatus !== editingTask.status) {
              const hasChild = (data.tasks || []).some((t: Task) => t.parentId === editingTask.id && !t.isDeleted);
              if (hasChild) {
                updateParentStatus(editingTask.id, newStatus);
              } else {
                updateTaskStatus(editingTask.id, newStatus);
              }
            }
            
            setEditingTask(null);
          }}
          onDelete={() => {
            deleteTask(editingTask.id);
            setEditingTask(null);
          }}
          onMoveUp={() => moveTaskOrder(editingTask.id, 'up')}
          onMoveDown={() => moveTaskOrder(editingTask.id, 'down')}
        />
      )}

      {incomingData && targetLocalData && (
        <MergeModal 
          localData={targetLocalData} 
          incomingData={incomingData} 
          onConfirm={(merged) => { 
            const finalMerged = { 
                ...targetLocalData, 
                ...merged, 
                isCloudSync: incomingData.isCloudSync ?? targetLocalData.isCloudSync ?? merged.isCloudSync,
                shortId: targetLocalData.shortId || incomingData.shortId
            };
            setData(finalMerged); 
            if (finalMerged.id !== activeId) switchProject(finalMerged.id); 
            setIncomingData(null); 
            alert('マージが完了しました'); 
          }} 
          onCancel={() => setIncomingData(null)} 
          onCreateNew={importNewProject} 
        />
      )}
      {showSettingsModal && data && (
        <ProjectSettingsModal 
          currentName={data.projectName} 
          currentId={data.id} 
          projects={projects} 
          isSyncEnabled={!String(data.id).startsWith('local_') && data.isCloudSync !== false}
          isPublic={!!data.isPublic}
          members={data.members || []}
          isAdmin={isAdmin}
          currentUserRole={currentUserRole}
          isCloudProject={isCloudProject}
          onClose={() => setShowSettingsModal(false)} 
          onSaveName={(newName) => { handleUpdateProjectName(newName); setShowSettingsModal(false); }} 
          onToggleSync={handleToggleSync}
          onTogglePublic={handleTogglePublic}
          onInviteUser={handleInviteUser}
          onChangeRole={handleChangeRole}
          onRemoveMember={handleRemoveMember}
          onDeleteProject={(isCloudDelete) => { deleteProject(data.id, isCloudDelete); setShowSettingsModal(false); }}
        />
      )}
      {showAddModal && <TaskAddModal taskName={inputTaskName} setTaskName={setInputTaskName} dateStr={inputDateStr} setDateStr={setInputDateStr} onSubmit={handleAddTaskWrapper} onClose={() => setShowAddModal(false)} />}

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
                                  
                                  {isSignedIn && (String(data.id).startsWith('local_') || data.isCloudSync === false) ? (
                                    <button onClick={() => uploadProject(data.id)} style={{ background: 'var(--bg-button)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="クラウドに保存">
                                      <IconCloudUpload size={16} />
                                    </button>
                                  ) : isSignedIn ? (
                                    <div style={{ display: 'flex', alignItems: 'center', color: (syncState === 'synced' || syncState === 'idle') ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
                                      {(syncState === 'waiting' || syncState === 'syncing') ? <IconLoader size={16} /> : <IconCheckCircle size={16} />}
                                    </div>
                                  ) : null}
                              </div>
                          </div>
                      </div>
                      {rightControls}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingLeft: '44px', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '10px' }}>
                          <span style={{ color: 'yellowgreen', fontSize: '0.9em', fontWeight: 'bold' }}>(全進捗: {projectProgress}%)</span>
                          {renderProgressBar()}
                      </div>
                      {isNarrowLayout && showSidebar && (
                        <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span>全プロジェクト表示</span>
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
                            <span style={{ textDecoration: 'underline dotted' }}>
                              <FormattedProjectName name={data.projectName} />
                            </span>
                          </h1>
                          {renderProjectMenu()}
                          
                          {isSignedIn && (String(data.id).startsWith('local_') || data.isCloudSync === false) ? (
                            <button onClick={() => uploadProject(data.id)} style={{ background: 'var(--bg-button)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.85em', fontWeight: 'bold' }} title="このプロジェクトをクラウドに保存">
                              <IconCloudUpload size={16} /> 保存
                            </button>
                          ) : isSignedIn ? (
                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px', color: (syncState === 'synced' || syncState === 'idle') ? 'var(--color-primary)' : 'var(--text-secondary)' }} title={syncState === 'waiting' || syncState === 'syncing' ? '同期待機中...' : 'クラウド同期済み'}>
                              {(syncState === 'waiting' || syncState === 'syncing') ? <IconLoader size={18} /> : <IconCheckCircle size={18} />}
                            </div>
                          ) : null}

                          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '10px', minWidth: '150px' }}>
                              <span style={{ color: 'yellowgreen', fontSize: '1.2em', fontWeight: 'bold' }}>(全進捗: {projectProgress}%)</span>
                              {renderProgressBar()}
                          </div>

                          {isNarrowLayout && showSidebar && (
                            <label style={{ marginLeft: 'auto', fontSize: '0.85em', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>全プロジェクト表示</span>
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
                  <span>全プロジェクト表示</span>
                  <div className="toggle-switch"><input type="checkbox" checked={showAllProjectsInCalendar} onChange={(e) => setShowAllProjectsInCalendar(e.target.checked)} /><span className="slider"></span></div>
                </label>
              </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0px' }}>
              <TaskCalendar tasks={calendarTasks} onStatusChange={isViewer ? () => {} : updateTaskStatus} onParentStatusChange={isViewer ? () => {} : updateParentStatus} />
            </div>
        </div>

        <div style={{ flex: 1, display: (isMobile && showSidebar) ? 'none' : 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!isMobile && !isViewer && <div style={{ marginBottom: '0px', flexShrink: 0 }}><TaskInput taskName={inputTaskName} setTaskName={setInputTaskName} dateStr={inputDateStr} setDateStr={setInputDateStr} onSubmit={() => handleAddTaskWrapper()} /></div>}
          
          {isViewer ? (
            <StaticBoardArea activeTasks={activeTasks} onBoardClick={handleBoardClick} isMobile={isMobile} isNarrowLayout={isNarrowLayout} onShowIOModal={() => setShowIOModal(true)} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}>
              <>{rootNodesContent}</>
            </StaticBoardArea>
          ) : (
            <InteractiveBoardArea activeTasks={activeTasks} onBoardClick={handleBoardClick} isMobile={isMobile} isNarrowLayout={isNarrowLayout} onShowAddModal={() => setShowAddModal(true)} onShowIOModal={() => setShowIOModal(true)} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}>
              <SortableContext items={rootNodes.map(r => r.id)} strategy={horizontalListSortingStrategy}>
                  {rootNodesContent}
              </SortableContext>
            </InteractiveBoardArea>
          )}

          {!isMobile && (
            <div style={{ marginTop: '10px', flexShrink: 0 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '32px' }}>
                {isDev && <button onClick={() => setShowDebug(!showDebug)} style={{ fontSize: '0.7em', color: 'var(--text-placeholder)', background: 'transparent', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }} >{showDebug ? 'デバッグを隠す' : 'デバッグを表示'}</button>}
                <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', gap: '15px' }}>
                  <button disabled={!canUndo} onClick={undo} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: canUndo ? 'pointer' : 'default', padding: '4px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', opacity: canUndo ? 1 : 0.4 }}><IconUndo size={18} /></button>
                  <button disabled={!canRedo} onClick={redo} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: canRedo ? 'pointer' : 'default', padding: '4px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', opacity: canRedo ? 1 : 0.4 }}><IconRedo size={18} /></button>
                </div>
              </div>
              {isDev && showDebug && <div style={{ marginTop: '15px', padding: '15px', background: 'var(--bg-button)', borderRadius: '8px', fontSize: '0.75em', color: 'var(--text-secondary)', maxHeight: '400px', overflowY: 'auto' }}><p><b>プロジェクト名:</b> {data.projectName}</p><p><b>適用マッピング:</b> <span style={{ color: 'var(--color-info)' }}>{debugInfo.mappingInfo}</span></p></div>}
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
          sharedState={sharedProjectState} 
          onClose={() => setSharedProjectState(null)}
          onOpenAsProject={(sharedData) => { addOrUpdateProject(sharedData); }}
          onMergeProject={(sharedData) => { setIncomingData(sharedData); }}
        />
      )}

      {isViewer ? (
        <>{mainAppContent}</>
      ) : (
        <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEndWrapper} onDragCancel={handleDragCancel} autoScroll={!isMobile} >
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