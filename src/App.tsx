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

type TaskNode = Task & { children: TaskNode[] };

// isMobileプロップを追加してスタイルを調整 + カスタム自動スクロールロジックを追加
const BoardArea = ({ children, activeTasks, onBoardClick, isMobile }: { children: React.ReactNode, activeTasks: Task[], onBoardClick: () => void, isMobile: boolean }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'root-board',
  });
  
  // スクロール制御用のRef
  const scrollRef = useRef<HTMLDivElement | null>(null);
  
  // setNodeRefとscrollRefを統合
  const setRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    scrollRef.current = node;
  }, [setNodeRef]);

  // ドラッグ状態とポインター位置の管理
  const [isDragging, setIsDragging] = useState(false);
  const pointerRef = useRef({ x: 0, y: 0 });

  // DndMonitorでドラッグ状態を監視 (このコンポーネントはDndContext内部にあるため使用可能)
  useDndMonitor({
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
    onDragCancel: () => setIsDragging(false),
  });

  // ==========================================
  // 追加: PC環境用 ドラッグスクロール（パン）状態管理
  // ==========================================
  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });
  const hasMovedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // モバイル、タスクドラッグ中、または左クリック以外は処理しない
    if (isMobile || isDragging || e.button !== 0) return;
    
    // タスク（[data-task-id]）の上でクリックされた場合は
    // タスクのドラッグや操作を優先するため、ボードのパンを行わない
    if ((e.target as Element).closest('[data-task-id]')) {
      return;
    }

    setIsPanning(true);
    hasMovedRef.current = false;
    setStartPos({ x: e.clientX, y: e.clientY });
    if (scrollRef.current) {
      setScrollPos({ left: scrollRef.current.scrollLeft, top: scrollRef.current.scrollTop });
    }
    // ポインターをキャプチャし、マウスが要素外に出ても追従するようにする
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || !scrollRef.current) return;
    
    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;

    // 少しでも動いたら「パンした」と判定し、単純なクリックと区別する
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }
    
    // 現在のスクロール位置を更新（移動量分を引く）
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
  // ==========================================

  // カスタム自動スクロールロジック (モバイルのみ有効)
  useEffect(() => {
    if (!isDragging || !isMobile) return;

    // ポインター位置の更新
    const updatePointer = (x: number, y: number) => {
      pointerRef.current = { x, y };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updatePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handlePointerMoveGlobal = (e: PointerEvent) => {
      updatePointer(e.clientX, e.clientY);
    };

    // イベントリスナー登録 (passive: true でパフォーマンス確保)
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('pointermove', handlePointerMoveGlobal);

    let animationFrameId: number;
    const MAX_SPEED = 15; // 最大スクロール速度 (px/frame)
    const DEADZONE = 0.4; // 中心から40%の範囲はスクロールしない（デッドゾーン）

    const tick = () => {
      if (scrollRef.current) {
        const rect = scrollRef.current.getBoundingClientRect();
        
        // BoardAreaの中心座標
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // 中心からの距離の比率を計算 (-1.0 〜 1.0)
        // 端 (width/2) にあるときが 1.0 (100%)
        const ratioX = (pointerRef.current.x - centerX) / (rect.width / 2);
        const ratioY = (pointerRef.current.y - centerY) / (rect.height / 2);
        
        let speedX = 0;
        let speedY = 0;

        const absX = Math.abs(ratioX);
        if (absX > DEADZONE) {
          // デッドゾーン境界で0、端で1になるように正規化
          const normalized = (absX - DEADZONE) / (1.0 - DEADZONE);
          speedX = Math.sign(ratioX) * normalized * MAX_SPEED;
        }

        const absY = Math.abs(ratioY);
        if (absY > DEADZONE) {
          const normalized = (absY - DEADZONE) / (1.0 - DEADZONE);
          speedY = Math.sign(ratioY) * normalized * MAX_SPEED;
        }
        
        // スクロール実行
        scrollRef.current.scrollLeft += speedX;
        scrollRef.current.scrollTop += speedY;
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    // ループ開始
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
      onClick={() => {
        // パン（ドラッグ）した直後の場合は、クリックイベントを無効化する
        if (!hasMovedRef.current) {
          onBoardClick();
        }
      }}
      style={{ 
        flex: 1, 
        overflowX: 'auto', 
        overflowY: 'auto',
        display: 'flex', 
        gap: isMobile ? '8px' : '16px', 
        alignItems: 'flex-start',
        paddingBottom: '20px',
        border: isOver ? '2px dashed var(--color-primary)' : '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: isMobile ? '8px' : '16px', 
        backgroundColor: 'var(--bg-surface)',
        transition: 'border 0.2s',
        minHeight: '200px',
        // ドラッグ中はカーソルを grabbing に変更、テキスト選択を防ぐ
        cursor: isPanning ? 'grabbing' : (isMobile ? 'default' : 'grab'),
        userSelect: isPanning ? 'none' : 'auto',
        position: 'relative' 
    }}>
      {activeTasks.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', margin: 'auto' }}>タスクを追加してください</p>
      ) : (
        children
      )}
    </div>
  );
};

function App() {
  const {
    // Data & State
    data,
    setData,
    incomingData,
    setIncomingData,
    targetLocalData,
    projects,
    activeId,
    activeTasks,
    rootNodes,
    projectProgress,
    debugInfo,
    activeParentId,
    calendarTasks,

    // UI State
    showDebug, setShowDebug,
    showSidebar, setShowSidebar,
    showProjectMenu, setShowProjectMenu,
    showRenameModal, setShowRenameModal,
    showAllProjectsInCalendar, setShowAllProjectsInCalendar,
    collapsedNodeIds,
    inputTaskName, setInputTaskName,
    inputDateStr, setInputDateStr,
    
    // メニュー制御
    menuOpenTaskId,
    setMenuOpenTaskId,

    // Operations & Handlers
    addProject,
    importNewProject,
    switchProject,
    deleteProject,
    getShareUrl,
    deleteTask,
    renameTask,
    updateTaskStatus,
    updateTaskDeadline,
    updateParentStatus,
    handleImportFromUrl,
    handleFileImport,
    handleAddTaskWrapper,
    handleTaskClick,
    handleBoardClick,
    handleProjectNameClick,
    toggleNodeExpansion,
    undo,
    redo,
    
    // Dnd
    sensors,
    handleDragEnd,
    customCollisionDetection,
  } = useTaskOperations();

  // フックを使用して画面幅やフラグを取得
  const { windowWidth, isMobile } = useResponsive();

  // ドラッグ中のアイテムID
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const isDev = import.meta.env.DEV;

  // 余白を詰める基準 (1280px未満)
  const isCompactSpacing = windowWidth < 1280;

  // バイブレーション処理
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    if (navigator.vibrate) {
      navigator.vibrate(50); // 50ms振動
    }
  };

  const handleDragEndWrapper = (event: DragEndEvent) => {
    setActiveDragId(null);
    handleDragEnd(event);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const activeDragTask = data?.tasks.find(t => t.id === activeDragId);

  if (!data) return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-primary)' }}>Loading...</div>;

  const getStrLen = (str: string) => { let len = 0; for (let i = 0; i < str.length; i++) len += (str.charCodeAt(i) < 256) ? 1 : 2; return len; };

  const calculateColumnWidth = (node: TaskNode, depth: number = 0): number => {
    // 画面幅に応じてパラメータを調整
    let BASE_WIDTH = 220;
    let INDENT_WIDTH = 24;
    let CHAR_WIDTH_PX = 12;
    let DEADLINE_WIDTH = 80;

    if (windowWidth <= 480) { // スマホ縦想定
        BASE_WIDTH = 140;
        INDENT_WIDTH = 10;
        CHAR_WIDTH_PX = 7;
        DEADLINE_WIDTH = 50;
    } else if (windowWidth <= 768) { // スマホ横・ミニタブレット想定
        BASE_WIDTH = 170;
        INDENT_WIDTH = 16;
        CHAR_WIDTH_PX = 9;
        DEADLINE_WIDTH = 60;
    } else if (windowWidth < 1280) { // タブレット・PC狭め想定
        BASE_WIDTH = 200;
        INDENT_WIDTH = 20;
        CHAR_WIDTH_PX = 10;
        DEADLINE_WIDTH = 70;
    }
    // 1280px以上はデフォルト値

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
                  // メニュー制御
                  isMenuOpen={menuOpenTaskId === n.id}
                  onToggleMenu={() => setMenuOpenTaskId(prev => prev === n.id ? null : n.id)}
                  // 親タスク選択状態
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

  // プロジェクトメニューのレンダリング（共通化）
  const renderProjectMenu = () => (
    <div style={{ position: 'relative' }}>
        <button onClick={(e) => { e.stopPropagation(); setShowProjectMenu(!showProjectMenu); }} style={{ padding: '0 4px', fontSize: '0.8em', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-placeholder)', cursor: 'pointer' }}>▼</button>
        {showProjectMenu && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 1000, minWidth: '200px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {projects.map(p => (
                        <div key={p.id} onClick={() => { switchProject(p.id); setShowProjectMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: p.id === activeId ? 'var(--bg-surface-hover)' : 'transparent', borderBottom: '1px solid var(--border-color)', fontSize: '0.9em', color: 'var(--text-primary)' }}>{p.projectName}</div>
                    ))}
                </div>
                <div onClick={() => { addProject(); setShowProjectMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--color-primary)', borderTop: '1px solid var(--border-color)', fontSize: '0.9em' }}>+ 新規プロジェクト</div>
                <div onClick={() => { deleteProject(activeId); setShowProjectMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--color-danger-text)', fontSize: '0.9em' }}>🗑️ このプロジェクトを削除</div>
            </div>
        )}
    </div>
  );

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={customCollisionDetection} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEndWrapper} 
      onDragCancel={handleDragCancel} 
      // モバイル時は標準の自動スクロールを無効化し、カスタムスクロールを優先
      autoScroll={!isMobile} 
    >
        {/* ルートコンテナ */}
        <div style={{ 
            maxWidth: '100%', 
            margin: '0 auto', 
            padding: isMobile ? '10px' : '20px',
            // セーフエリア対応
            paddingBottom: `calc(${isMobile ? '10px' : '20px'} + env(safe-area-inset-bottom))`, 
            paddingTop: `calc(${isMobile ? '10px' : '20px'} + env(safe-area-inset-top))`,
            paddingLeft: `calc(${isMobile ? '10px' : '20px'} + env(safe-area-inset-left))`,
            paddingRight: `calc(${isMobile ? '10px' : '20px'} + env(safe-area-inset-right))`,
            display: 'flex', 
            flexDirection: 'column', 
            height: '100vh', 
            boxSizing: 'border-box', 
            overflow: 'hidden' 
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

          {/* 1. Header Area */}
          <header style={{ 
              display: 'flex', 
              flexDirection: 'row',
              justifyContent: 'space-between', 
              alignItems: isMobile ? 'flex-start' : 'center', 
              flexShrink: 0, 
              marginBottom: isCompactSpacing ? '5px' : '10px', 
              gap: isMobile ? '10px' : '0'
          }}>
              {isMobile ? (
                  // スマホ用ヘッダー
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {/* <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>TaskLink:</div> */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <button onClick={() => setShowSidebar(!showSidebar)} style={{ padding: '8px', fontSize: '1.2em', backgroundColor: showSidebar ? 'var(--color-primary)' : 'var(--bg-button)', color: showSidebar ? '#fff' : 'var(--text-primary)' }} title="カレンダーを表示/非表示">📅</button>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span 
                                    style={{ fontSize: '1.2em', fontWeight: 'bold', textDecoration: 'underline dotted', cursor: 'pointer', color: 'var(--text-primary)' }} 
                                    onClick={handleProjectNameClick}
                                  >
                                    {data.projectName}
                                  </span>
                                  {renderProjectMenu()}
                              </div>
                              <span style={{ color: 'yellowgreen', fontSize: '0.9em', fontWeight: 'bold', marginTop: '4px' }}>
                                (全進捗: {projectProgress}%)
                              </span>
                          </div>
                      </div>
                  </div>
              ) : (
                  // PC用ヘッダー
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <button onClick={() => setShowSidebar(!showSidebar)} style={{ padding: '8px', fontSize: '1.2em', backgroundColor: showSidebar ? 'var(--color-primary)' : 'var(--bg-button)', color: showSidebar ? '#fff' : 'var(--text-primary)' }} title="カレンダーを表示/非表示">📅</button>
                      <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                              <h1 style={{ margin: 0, fontSize: '1.5em', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={handleProjectNameClick}> <span style={{ textDecoration: 'underline dotted' }}>{data.projectName}</span></h1>
                              {renderProjectMenu()}
                              <span style={{ color: 'yellowgreen', fontSize: '1.2em', fontWeight: 'bold', marginLeft: '10px' }}>(全進捗: {projectProgress}%)</span>
                          </div>
                      </div>
                  </div>
              )}

              {/* ProjectControls */}
              <div>
                <ProjectControls 
                    onCopyLink={() => navigator.clipboard.writeText(getShareUrl()).then(() => alert('コピー完了'))}
                    onExport={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `${data.projectName}.json`; a.click(); }}
                    onImport={handleFileImport}
                    onImportFromUrl={handleImportFromUrl} 
                />
              </div>
          </header>

          {/* 2. Content Body (Sidebar + Main) */}
          <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', gap: (showSidebar && !isMobile) ? '23px' : '0' }}>
            
            {/* Sidebar (Calendar) */}
            <div style={{ 
              flex: showSidebar ? (isMobile ? '1 0 100%' : '0 0 35%') : '0 0 0px', 
              display: 'flex', flexDirection: 'column', 
              overflow: 'hidden', 
              transition: 'flex 0.3s ease, opacity 0.3s ease', 
              opacity: showSidebar ? 1 : 0, 
              pointerEvents: showSidebar ? 'auto' : 'none',
              height: '100%', 
              minWidth: showSidebar ? (isMobile ? '100%' : '300px') : '0' 
            }}>
                <div style={{ 
                    padding: '10px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'flex-end', 
                    flexShrink: 0,
                    marginBottom: isMobile ? '0px' : '21px'
                }}>
                    <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>全プロジェクト表示</span>
                        <div className="toggle-switch">
                            <input 
                                type="checkbox" 
                                checked={showAllProjectsInCalendar} 
                                onChange={(e) => setShowAllProjectsInCalendar(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </div>
                    </label>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0px' }}>
                    <TaskCalendar 
                        tasks={calendarTasks} 
                        onStatusChange={updateTaskStatus}
                        onParentStatusChange={updateParentStatus}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div style={{ 
              flex: 1, 
              display: (isMobile && showSidebar) ? 'none' : 'flex', 
              flexDirection: 'column', 
              minWidth: 0 
            }}>
              <div style={{ marginBottom: '0px', flexShrink: 0 }}>
                <TaskInput taskName={inputTaskName} setTaskName={setInputTaskName} dateStr={inputDateStr} setDateStr={setInputDateStr} onSubmit={() => handleAddTaskWrapper()} />
              </div>

              <BoardArea activeTasks={activeTasks} onBoardClick={handleBoardClick} isMobile={isMobile}>
                <SortableContext items={rootNodes.map(r => r.id)} strategy={horizontalListSortingStrategy}>
                    {rootNodes.map(root => {
                        const colWidth = calculateColumnWidth(root);
                        return (
                          <SortableTaskItem key={root.id} id={root.id} depth={0}>
                            <div style={{ 
                                minWidth: `${colWidth}px`, maxWidth: `${colWidth}px`, 
                                backgroundColor: 'var(--bg-task)', /* 変更: タスク背景色 */
                                borderRadius: '8px', 
                                border: '1px solid var(--border-color)', 
                                padding: '10px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                height: 'fit-content', 
                                cursor: 'grab' 
                            }}>
                                <div style={{ borderBottom: '2px solid var(--border-color)', marginBottom: '8px', paddingBottom: '4px' }}>
                                    <TaskItem 
                                      task={root} tasks={data.tasks} depth={0} hasChildren={root.children.length > 0} 
                                      onStatusChange={(s) => updateTaskStatus(root.id, s)} 
                                      onParentStatusChange={updateParentStatus}
                                      onDelete={() => deleteTask(root.id)} 
                                      onRename={(newName) => renameTask(root.id, newName)} 
                                      onDeadlineChange={(dateStr) => updateTaskDeadline(root.id, dateStr)} 
                                      isExpanded={!collapsedNodeIds.has(root.id)} onToggleExpand={() => toggleNodeExpansion(root.id)}
                                      onClick={() => handleTaskClick(root)}
                                      isMenuOpen={menuOpenTaskId === root.id}
                                      onToggleMenu={() => setMenuOpenTaskId(prev => prev === root.id ? null : root.id)}
                                      // 親タスク選択状態
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

              {/* Footer / Debug Area */}
              <div style={{ marginTop: '10px', flexShrink: 0 }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '30px' }}>
                  {isDev && (
                    <button 
                      onClick={() => setShowDebug(!showDebug)} 
                      style={{ fontSize: '0.7em', color: 'var(--text-placeholder)', background: 'transparent', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {showDebug ? 'デバッグを隠す' : 'デバッグを表示'}
                    </button>
                  )}

                  <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', gap: '15px' }}>
                    <button
                      onClick={undo}
                      title="元に戻す (Ctrl+Z)"
                      style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 12px', borderRadius: '4px', fontSize: '1.4em', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px' }}
                    >
                      ↩
                    </button>
                    <button
                      onClick={redo}
                      title="やり直す (Ctrl+y)"
                      style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 12px', borderRadius: '4px', fontSize: '1.4em', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px' }}
                    >
                      ↪
                    </button>
                  </div>
                </div>
                {isDev && showDebug && (
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    background: 'var(--bg-button)', 
                    borderRadius: '8px', 
                    fontSize: '0.75em', 
                    color: 'var(--text-secondary)', 
                    maxHeight: '400px', 
                    overflowY: 'auto'
                  }}>
                    <p><b>プロジェクト名:</b> {data.projectName}</p>
                    <p><b>適用マッピング:</b> <span style={{ color: 'var(--color-info)' }}>{debugInfo.mappingInfo}</span></p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 20px', margin: '10px 0', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-placeholder)' }}>変換なしJSON:</span><span style={{ fontSize: '1.1em' }}>{debugInfo.normalLen.toLocaleString()} 文字</span>
                      <span style={{ color: 'var(--text-secondary)' }}>圧縮直前(Base185+Swap):</span><span style={{ fontSize: '1.1em' }}>{debugInfo.intermediateLen.toLocaleString()} 文字</span>
                      <span style={{ color: 'var(--color-primary)' }}>最終圧縮後(LZ):</span><span style={{ fontSize: '1.1em', fontWeight: 'bold', color: 'var(--color-primary)' }}>{debugInfo.compressedLen.toLocaleString()} 文字</span>
                      <span>圧縮率:</span><span><b>{debugInfo.rate.toFixed(1)}%</b><span style={{ marginLeft: '8px', color: 'var(--text-placeholder)', fontSize: '0.9em' }}>( {(100 - debugInfo.rate).toFixed(1)}% 削減 )</span></span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div><p style={{ margin: '0 0 5px 0', color: 'var(--text-placeholder)' }}><b>1. 変換なしJSON (Raw):</b></p><div style={{ maxHeight: '150px', overflowY: 'auto', background: 'var(--bg-surface)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}><code style={{ wordBreak: 'break-all', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{debugInfo.normal}</code></div></div>
                      <div><p style={{ margin: '0 0 5px 0', color: 'var(--text-secondary)' }}><b>2. 圧縮直前データ (Base185 + Swap):</b></p><div style={{ maxHeight: '150px', overflowY: 'auto', background: 'var(--bg-surface)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}><code style={{ wordBreak: 'break-all', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{debugInfo.intermediate}</code></div></div>
                      <div><p style={{ margin: '0 0 5px 0', color: 'var(--color-primary)' }}><b>3. 最終圧縮データ (LZ):</b></p><div style={{ maxHeight: '150px', overflowY: 'auto', background: 'var(--bg-surface)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}><code style={{ wordBreak: 'break-all', color: 'var(--color-primary)', fontFamily: 'monospace' }}>{debugInfo.compressed}</code></div></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* DragOverlay の追加 */}
        <DragOverlay dropAnimation={null}>
          {activeDragTask ? (
            <div style={{ 
              backgroundColor: 'var(--bg-task)', /* 変更: タスク背景色 */
              borderRadius: '8px', 
              border: '1px solid var(--color-primary)', 
              padding: '10px', 
              boxShadow: '0 5px 15px rgba(0,0,0,0.5)', 
              opacity: 0.9,
              cursor: 'grabbing',
              minWidth: '220px',
              width: 'max-content',
              maxWidth: '90vw'
            }}>
              <TaskItem 
                task={activeDragTask} 
                tasks={data.tasks} 
                depth={0} 
                hasChildren={data.tasks.some(t => t.parentId === activeDragTask.id && !t.isDeleted)}
                onStatusChange={() => {}} 
                onParentStatusChange={() => {}}
                onDelete={() => {}}
                onRename={() => {}}
                onDeadlineChange={() => {}}
                isExpanded={false}
                onToggleExpand={() => {}}
                onClick={() => {}}
                isMenuOpen={false}
                onToggleMenu={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
    </DndContext>
  );
}

export default App;