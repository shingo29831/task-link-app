import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/clerk-react";

import { useTaskOperations } from './hooks/useTaskOperations';
import { useResponsive } from './hooks/useResponsive';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { ProjectControls } from './components/ProjectControls';
import { TaskCalendar } from './components/TaskCalendar';
import type { Task } from './types';
import { MergeModal } from './components/MergeModal';
import { SortableTaskItem } from './components/SortableTaskItem';
import { ProjectNameEditModal } from './components/ProjectNameEditModal';
import { TaskAddModal } from './components/TaskAddModal';
import { IconUndo, IconRedo, IconCalendar, IconCaretDown, IconPlus, IconTrash } from './components/Icons';

type TaskNode = Task & { children: TaskNode[] };

const BoardArea = ({ 
  children, 
  activeTasks, 
  onBoardClick, 
  isMobile, 
  onShowAddModal,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: { 
  children: React.ReactNode, 
  activeTasks: Task[], 
  onBoardClick: () => void, 
  isMobile: boolean,
  onShowAddModal: () => void,
  onUndo: () => void,
  onRedo: () => void,
  canUndo: boolean,
  canRedo: boolean
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'root-board',
  });
  
  const scrollRef = useRef<HTMLDivElement | null>(null);
  
  const setRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    scrollRef.current = node;
  }, [setNodeRef]);

  const [isDragging, setIsDragging] = useState(false);
  const pointerRef = useRef({ x: 0, y: 0 });

  useDndMonitor({
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
    onDragCancel: () => setIsDragging(false),
  });

  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });
  const hasMovedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || isDragging || e.button !== 0) return;
    if ((e.target as Element).closest('[data-task-id]')) return;

    setIsPanning(true);
    hasMovedRef.current = false;
    setStartPos({ x: e.clientX, y: e.clientY });
    if (scrollRef.current) {
      setScrollPos({ left: scrollRef.current.scrollLeft, top: scrollRef.current.scrollTop });
    }
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || !scrollRef.current) return;
    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMovedRef.current = true;
    scrollRef.current.scrollLeft = scrollPos.left - dx;
    scrollRef.current.scrollTop = scrollPos.top - dy;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setIsPanning(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setIsPanning(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

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
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const ratioX = (pointerRef.current.x - centerX) / (rect.width / 2);
        const ratioY = (pointerRef.current.y - centerY) / (rect.height / 2);
        let speedX = 0, speedY = 0;
        if (Math.abs(ratioX) > 0.4) speedX = Math.sign(ratioX) * ((Math.abs(ratioX) - 0.4) / 0.6) * 15;
        if (Math.abs(ratioY) > 0.4) speedY = Math.sign(ratioY) * ((Math.abs(ratioY) - 0.4) / 0.6) * 15;
        scrollRef.current.scrollLeft += speedX;
        scrollRef.current.scrollTop += speedY;
      }
      animationFrameId = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('pointermove', handlePointerMoveGlobal);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDragging, isMobile]);

  return (
    <div 
      ref={setRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={() => { if (!hasMovedRef.current) onBoardClick(); }}
      style={{ 
        flex: 1, overflowX: 'auto', overflowY: 'auto', display: 'flex', 
        gap: isMobile ? '8px' : '16px', alignItems: 'flex-start',
        border: isOver ? '2px dashed var(--color-primary)' : '1px solid var(--border-color)',
        borderRadius: '8px', padding: isMobile ? '8px' : '16px', 
        backgroundColor: 'var(--bg-surface)', transition: 'border 0.2s', minHeight: '200px',
        cursor: isPanning ? 'grabbing' : (isMobile ? 'default' : 'grab'),
        userSelect: isPanning ? 'none' : 'auto', position: 'relative' 
      }}>
      {activeTasks.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', margin: 'auto' }}>タスクを追加してください</p>
      ) : (
        children
      )}

      {/* モバイル用 UI オーバーレイ */}
      {isMobile && !isDragging && (
        <>
          {/* 左下: Undo/Redo ボタン */}
          <div style={{
            position: 'fixed',
            bottom: 'max(20px, env(safe-area-inset-bottom))',
            left: 'max(20px, env(safe-area-inset-left))',
            display: 'flex',
            gap: '10px',
            zIndex: 100
          }}>
            <button
              disabled={!canUndo}
              onClick={(e) => { e.stopPropagation(); onUndo(); }}
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(4px)',
                color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)', 
                cursor: canUndo ? 'pointer' : 'default',
                opacity: canUndo ? 1 : 0.4
              }}
            >
              <IconUndo size={20} />
            </button>
            <button
              disabled={!canRedo}
              onClick={(e) => { e.stopPropagation(); onRedo(); }}
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(4px)',
                color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)', 
                cursor: canRedo ? 'pointer' : 'default',
                opacity: canRedo ? 1 : 0.4
              }}
            >
              <IconRedo size={20} />
            </button>
          </div>

          {/* 右下: タスク追加ボタン (FAB) */}
          <button
            onClick={(e) => { e.stopPropagation(); onShowAddModal(); }}
            style={{
              position: 'fixed',
              bottom: 'max(20px, env(safe-area-inset-bottom))',
              right: 'max(20px, env(safe-area-inset-right))',
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: 'var(--color-primary)', color: 'white',
              border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 100, opacity: 0.85, cursor: 'pointer'
            }}
          >
            <IconPlus size={28} />
          </button>
        </>
      )}
    </div>
  );
};

function App() {
  const { getToken, isSignedIn } = useAuth(); // Clerkから認証情報取得
  
  const {
    data, setData, incomingData, setIncomingData, targetLocalData, projects, activeId, activeTasks,
    rootNodes, projectProgress, debugInfo, activeParentId, calendarTasks,
    showDebug, setShowDebug, showSidebar, setShowSidebar, showProjectMenu, setShowProjectMenu,
    showRenameModal, setShowRenameModal, showAllProjectsInCalendar, setShowAllProjectsInCalendar,
    collapsedNodeIds, inputTaskName, setInputTaskName, inputDateStr, setInputDateStr,
    menuOpenTaskId, setMenuOpenTaskId,
    addProject, importNewProject, switchProject, deleteProject, getShareUrl,
    deleteTask, renameTask, updateTaskStatus, updateTaskDeadline, updateParentStatus,
    handleImportFromUrl, handleFileImport, handleAddTaskWrapper, handleTaskClick,
    handleBoardClick, handleProjectNameClick, toggleNodeExpansion, undo, redo,
    canUndo, canRedo, 
    sensors, handleDragEnd, customCollisionDetection,
  } = useTaskOperations();

  const { windowWidth, isMobile } = useResponsive();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const isDev = import.meta.env.DEV;
  const isCompactSpacing = windowWidth < 1280;

  // 認証メニューの状態管理
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);
  const authMenuRef = useRef<HTMLDivElement>(null);

  // バックエンドとのユーザー情報同期 (ログイン直後)
  useEffect(() => {
    const syncUserToDatabase = async () => {
      if (!isSignedIn) return;

      try {
        const token = await getToken();
        // Hono API (ターミナル2で立ち上がっているポート。基本は5174になります)
        const response = await fetch('http://localhost:5174/api/user/sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          console.log('バックエンドとのユーザー同期が完了しました！');
        }
      } catch (error) {
        console.error('ユーザー同期に失敗しました:', error);
      }
    };

    syncUserToDatabase();
  }, [isSignedIn, getToken]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (authMenuRef.current && !authMenuRef.current.contains(event.target as Node)) {
        setIsAuthMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleDragEndWrapper = (event: DragEndEvent) => {
    setActiveDragId(null);
    handleDragEnd(event);
  };

  const handleDragCancel = () => { setActiveDragId(null); };

  const activeDragTask = data?.tasks.find(t => t.id === activeDragId);

  if (!data) return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-primary)' }}>Loading...</div>;

  const getStrLen = (str: string) => { let len = 0; for (let i = 0; i < str.length; i++) len += (str.charCodeAt(i) < 256) ? 1 : 2; return len; };

  const calculateColumnWidth = (node: TaskNode, depth: number = 0): number => {
    let BASE_WIDTH = 220, INDENT_WIDTH = 24, CHAR_WIDTH_PX = 12, DEADLINE_WIDTH = 80;
    if (windowWidth <= 480) { BASE_WIDTH = 140; INDENT_WIDTH = 10; CHAR_WIDTH_PX = 7; DEADLINE_WIDTH = 50; }
    else if (windowWidth <= 768) { BASE_WIDTH = 170; INDENT_WIDTH = 16; CHAR_WIDTH_PX = 9; DEADLINE_WIDTH = 60; }
    else if (windowWidth < 1280) { BASE_WIDTH = 200; INDENT_WIDTH = 20; CHAR_WIDTH_PX = 10; DEADLINE_WIDTH = 70; }
    const len = getStrLen(node.name);
    const textWidth = Math.min(len, 20) * CHAR_WIDTH_PX;
    const extraWidth = node.deadline !== undefined ? DEADLINE_WIDTH : 0;
    let max = BASE_WIDTH + (depth * INDENT_WIDTH) + textWidth + extraWidth;
    if (node.children) { for (const child of node.children) max = Math.max(max, calculateColumnWidth(child, depth + 1)); }
    return max;
  };

  const renderColumnChildren = (nodes: TaskNode[], depth = 0) => {
    return (
      <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
        {nodes.map(n => (
          <React.Fragment key={n.id}>
            <SortableTaskItem id={n.id} depth={depth}>
                <TaskItem 
                  task={n} tasks={data.tasks} depth={depth} hasChildren={n.children.length > 0}
                  onStatusChange={(s) => updateTaskStatus(n.id, s)} 
                  onParentStatusChange={updateParentStatus}
                  onDelete={() => deleteTask(n.id)} 
                  onRename={(newName) => renameTask(n.id, newName)} 
                  onDeadlineChange={(dateStr) => updateTaskDeadline(n.id, dateStr)} 
                  isExpanded={!collapsedNodeIds.has(n.id)} onToggleExpand={() => toggleNodeExpansion(n.id)}
                  onClick={() => handleTaskClick(n)}
                  isMenuOpen={menuOpenTaskId === n.id}
                  onToggleMenu={() => setMenuOpenTaskId(prev => prev === n.id ? null : n.id)}
                  isActiveParent={activeParentId === n.id}
                />
                {n.children.length > 0 && !collapsedNodeIds.has(n.id) && (
                    <div style={{ paddingLeft: '0px' }}>{renderColumnChildren(n.children, depth + 1)}</div>
                )}
            </SortableTaskItem>
          </React.Fragment>
        ))}
      </SortableContext>
    );
  };

  const renderProjectMenu = () => (
    <div style={{ position: 'relative' }}>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowProjectMenu(!showProjectMenu); }} 
          style={{ 
            padding: '4px', background: 'transparent', border: '1px solid var(--border-light)', 
            color: 'var(--text-placeholder)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px'
          }}
        ><IconCaretDown size={12} /></button>
        {showProjectMenu && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 1000, minWidth: '200px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {projects.map(p => (
                        <div key={p.id} onClick={() => { switchProject(p.id); setShowProjectMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: p.id === activeId ? 'var(--bg-surface-hover)' : 'transparent', borderBottom: '1px solid var(--border-color)', fontSize: '0.9em', color: 'var(--text-primary)' }}>{p.projectName}</div>
                    ))}
                </div>
                <div onClick={() => { addProject(); setShowProjectMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--color-primary)', borderTop: '1px solid var(--border-color)', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}><IconPlus size={16} /><span>新規プロジェクト</span></div>
                <div onClick={() => { deleteProject(activeId); setShowProjectMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--color-danger-text)', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}><IconTrash size={16} /><span>このプロジェクトを削除</span></div>
            </div>
        )}
    </div>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEndWrapper} onDragCancel={handleDragCancel} autoScroll={!isMobile} >
        <div style={{ 
            maxWidth: '100%', margin: '0 auto', padding: isMobile ? '10px' : '20px',
            paddingBottom: `calc(${isMobile ? '5px' : '20px'} + env(safe-area-inset-bottom))`, 
            paddingTop: `calc(${isMobile ? '5px' : '20px'} + env(safe-area-inset-top))`,
            paddingLeft: `calc(${isMobile ? '5px' : '20px'} + env(safe-area-inset-left))`,
            paddingRight: `calc(${isMobile ? '5px' : '20px'} + env(safe-area-inset-right))`,
            display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box', overflow: 'hidden' 
        }} onClick={() => { if (showProjectMenu) setShowProjectMenu(false); }}>
          
          {/* モーダル類 */}
          {incomingData && targetLocalData && (
            <MergeModal 
                localData={targetLocalData} incomingData={incomingData} 
                onConfirm={(merged) => { setData(merged); if (merged.id !== activeId) switchProject(merged.id); setIncomingData(null); alert('マージが完了しました'); }}
                onCancel={() => setIncomingData(null)} onCreateNew={importNewProject}
            />
          )}
          {showRenameModal && data && (
            <ProjectNameEditModal 
              currentName={data.projectName} currentId={data.id} projects={projects} onClose={() => setShowRenameModal(false)}
              onSave={(newName) => { setData({ ...data, projectName: newName, lastSynced: Date.now() }); setShowRenameModal(false); }}
            />
          )}
          {showAddModal && (
            <TaskAddModal
              taskName={inputTaskName} setTaskName={setInputTaskName}
              dateStr={inputDateStr} setDateStr={setInputDateStr}
              onSubmit={handleAddTaskWrapper}
              onClose={() => setShowAddModal(false)}
            />
          )}

          <header style={{ 
              display: 'flex', flexDirection: 'row', justifyContent: 'space-between', 
              alignItems: isMobile ? 'flex-start' : 'center', flexShrink: 0, 
              marginBottom: isCompactSpacing ? '5px' : '10px', gap: isMobile ? '10px' : '5px',
              paddingBottom: isMobile ? '10px' : '0px', 
              paddingTop: isMobile ? '10px' : '0px',
              paddingLeft: isMobile ? '10px' : '0px',
              paddingRight: isMobile ? '10px' : '0px',
          }}>
              {isMobile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <button onClick={() => setShowSidebar(!showSidebar)} style={{ padding: '8px', backgroundColor: showSidebar ? 'var(--color-primary)' : 'var(--bg-button)', color: showSidebar ? '#fff' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '4px' }} title="カレンダーを表示/非表示">
                            <IconCalendar size={20} />
                          </button>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '1.2em', fontWeight: 'bold', textDecoration: 'underline dotted', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={handleProjectNameClick}> {data.projectName} </span>
                                  {renderProjectMenu()}
                              </div>
                              <span style={{ color: 'yellowgreen', fontSize: '0.9em', fontWeight: 'bold', marginTop: '4px' }}> (全進捗: {projectProgress}%) </span>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <button onClick={() => setShowSidebar(!showSidebar)} style={{ padding: '8px', backgroundColor: showSidebar ? 'var(--color-primary)' : 'var(--bg-button)', color: showSidebar ? '#fff' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '4px' }} title="カレンダーを表示/非表示">
                        <IconCalendar size={20} />
                      </button>
                      <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                              <h1 style={{ margin: 0, fontSize: '1.5em', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={handleProjectNameClick}> <span style={{ textDecoration: 'underline dotted' }}>{data.projectName}</span></h1>
                              {renderProjectMenu()}
                              <span style={{ color: 'yellowgreen', fontSize: '1.2em', fontWeight: 'bold', marginLeft: '10px' }}>(全進捗: {projectProgress}%)</span>
                          </div>
                      </div>
                  </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <ProjectControls onCopyLink={() => navigator.clipboard.writeText(getShareUrl()).then(() => alert('コピー完了'))} onExport={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `${data.projectName}.json`; a.click(); }} onImport={handleFileImport} onImportFromUrl={handleImportFromUrl} />
                
                {/* 認証UIの追加 */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <SignedIn>
                    <UserButton />
                  </SignedIn>
                  <SignedOut>
                    <div ref={authMenuRef} style={{ position: 'relative' }}>
                      <button 
                        onClick={() => setIsAuthMenuOpen(!isAuthMenuOpen)}
                        style={{
                          width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-button)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', padding: 0
                        }}
                        aria-label="アカウントメニューを開く"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {isAuthMenuOpen && (
                        <div style={{
                          position: 'absolute', right: 0, top: '100%', marginTop: '8px', width: '150px', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', zIndex: 1000, overflow: 'hidden'
                        }}>
                          <SignInButton mode="modal">
                            <button 
                              onClick={() => setIsAuthMenuOpen(false)}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: '0.9em', color: 'var(--text-primary)', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                            >
                              ログイン
                            </button>
                          </SignInButton>
                          <SignUpButton mode="modal">
                            <button 
                              onClick={() => setIsAuthMenuOpen(false)}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: '0.9em', color: 'var(--text-primary)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                              新規登録
                            </button>
                          </SignUpButton>
                        </div>
                      )}
                    </div>
                  </SignedOut>
                </div>
              </div>
          </header>

          <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', gap: (showSidebar && !isMobile) ? '23px' : '0' }}>
            <div style={{ 
              flex: showSidebar ? (isMobile ? '1 0 100%' : '0 0 35%') : '0 0 0px', 
              display: 'flex', flexDirection: 'column', overflow: 'hidden', 
              transition: 'flex 0.3s ease, opacity 0.3s ease', opacity: showSidebar ? 1 : 0, 
              pointerEvents: showSidebar ? 'auto' : 'none', height: '100%', 
              minWidth: showSidebar ? (isMobile ? '100%' : '300px') : '0' 
            }}>
                <div style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, marginBottom: isMobile ? '0px' : '21px' }}>
                    <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>全プロジェクト表示</span>
                        <div className="toggle-switch"><input type="checkbox" checked={showAllProjectsInCalendar} onChange={(e) => setShowAllProjectsInCalendar(e.target.checked)} /><span className="slider"></span></div>
                    </label>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0px' }}>
                    <TaskCalendar tasks={calendarTasks} onStatusChange={updateTaskStatus} onParentStatusChange={updateParentStatus} />
                </div>
            </div>

            <div style={{ flex: 1, display: (isMobile && showSidebar) ? 'none' : 'flex', flexDirection: 'column', minWidth: 0 }}>
              {!isMobile && (
                <div style={{ marginBottom: '0px', flexShrink: 0 }}>
                  <TaskInput taskName={inputTaskName} setTaskName={setInputTaskName} dateStr={inputDateStr} setDateStr={setInputDateStr} onSubmit={() => handleAddTaskWrapper()} />
                </div>
              )}

              <BoardArea 
                activeTasks={activeTasks} 
                onBoardClick={handleBoardClick} 
                isMobile={isMobile}
                onShowAddModal={() => setShowAddModal(true)}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
              >
                <SortableContext items={rootNodes.map(r => r.id)} strategy={horizontalListSortingStrategy}>
                    {rootNodes.map(root => {
                        const colWidth = calculateColumnWidth(root);
                        return (
                          <SortableTaskItem key={root.id} id={root.id} depth={0}>
                            <div style={{ 
                                minWidth: `${colWidth}px`, maxWidth: `${colWidth}px`, backgroundColor: 'var(--bg-task)', borderRadius: '8px', 
                                border: '1px solid var(--border-color)', padding: '10px', display: 'flex', flexDirection: 'column', 
                                height: 'fit-content', cursor: 'grab' 
                            }}>
                                <div style={{ borderBottom: '2px solid var(--border-color)', marginBottom: '8px', paddingBottom: '4px' }}>
                                    <TaskItem 
                                      task={root} tasks={data.tasks} depth={0} hasChildren={root.children.length > 0} 
                                      onStatusChange={(s) => updateTaskStatus(root.id, s)} onParentStatusChange={updateParentStatus}
                                      onDelete={() => deleteTask(root.id)} onRename={(newName) => renameTask(root.id, newName)} 
                                      onDeadlineChange={(dateStr) => updateTaskDeadline(root.id, dateStr)} 
                                      isExpanded={!collapsedNodeIds.has(root.id)} onToggleExpand={() => toggleNodeExpansion(root.id)}
                                      onClick={() => handleTaskClick(root)} isMenuOpen={menuOpenTaskId === root.id}
                                      onToggleMenu={() => setMenuOpenTaskId(prev => prev === root.id ? null : root.id)}
                                      isActiveParent={activeParentId === root.id}
                                    />
                                </div>
                                <div style={{ paddingLeft: '4px', cursor: 'auto' }}>{!collapsedNodeIds.has(root.id) && renderColumnChildren(root.children, 0)}</div>
                            </div>
                          </SortableTaskItem>
                        );
                    })}
                </SortableContext>
              </BoardArea>

              {/* PC時のみ表示されるフッター */}
              {!isMobile && (
                <div style={{ marginTop: '10px', flexShrink: 0 }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '32px' }}>
                    {isDev && (
                      <button onClick={() => setShowDebug(!showDebug)} style={{ fontSize: '0.7em', color: 'var(--text-placeholder)', background: 'transparent', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }} >{showDebug ? 'デバッグを隠す' : 'デバッグを表示'}</button>
                    )}
                    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', gap: '15px' }}>
                      <button 
                        disabled={!canUndo}
                        onClick={undo} 
                        title="元に戻す (Ctrl+Z)" 
                        style={{ 
                          background: 'transparent', border: '1px solid var(--border-color)', 
                          color: 'var(--text-secondary)', cursor: canUndo ? 'pointer' : 'default', 
                          padding: '4px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', 
                          justifyContent: 'center', height: '32px',
                          opacity: canUndo ? 1 : 0.4 
                        }} 
                      ><IconUndo size={18} /></button>
                      <button 
                        disabled={!canRedo}
                        onClick={redo} 
                        title="やり直す (Ctrl+y)" 
                        style={{ 
                          background: 'transparent', border: '1px solid var(--border-color)', 
                          color: 'var(--text-secondary)', cursor: canRedo ? 'pointer' : 'default', 
                          padding: '4px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', 
                          justifyContent: 'center', height: '32px',
                          opacity: canRedo ? 1 : 0.4
                        }} 
                      ><IconRedo size={18} /></button>
                    </div>
                  </div>
                  {isDev && showDebug && (
                    <div style={{ marginTop: '15px', padding: '15px', background: 'var(--bg-button)', borderRadius: '8px', fontSize: '0.75em', color: 'var(--text-secondary)', maxHeight: '400px', overflowY: 'auto' }}>
                      <p><b>プロジェクト名:</b> {data.projectName}</p>
                      <p><b>適用マッピング:</b> <span style={{ color: 'var(--color-info)' }}>{debugInfo.mappingInfo}</span></p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragTask ? (
            <div style={{ backgroundColor: 'var(--bg-task)', borderRadius: '8px', border: '1px solid var(--color-primary)', padding: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', opacity: 0.9, cursor: 'grabbing', minWidth: '220px', width: 'max-content', maxWidth: '90vw' }}>
              <TaskItem task={activeDragTask} tasks={data.tasks} depth={0} hasChildren={data.tasks.some(t => t.parentId === activeDragTask.id && !t.isDeleted)} onStatusChange={() => {}} onParentStatusChange={() => {}} onDelete={() => {}} onRename={() => {}} onDeadlineChange={() => {}} isExpanded={false} onToggleExpand={() => {}} onClick={() => {}} isMenuOpen={false} onToggleMenu={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
    </DndContext>
  );
}

export default App;