import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  useDroppable,
  DragOverlay, // 追加
  type DragStartEvent, // 追加
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';

import { useTaskOperations } from './hooks/useTaskOperations';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { ProjectControls } from './components/ProjectControls';
import { TaskCalendar } from './components/TaskCalendar';
import type { Task } from './types';
import { MergeModal } from './components/MergeModal';
import { SortableTaskItem } from './components/SortableTaskItem';
import { ProjectNameEditModal } from './components/ProjectNameEditModal';

type TaskNode = Task & { children: TaskNode[] };

// isMobileプロップを追加してスタイルを調整
const BoardArea = ({ children, activeTasks, onBoardClick, isMobile }: { children: React.ReactNode, activeTasks: Task[], onBoardClick: () => void, isMobile: boolean }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'root-board',
  });

  return (
    <div 
      ref={setNodeRef}
      onClick={() => {
        onBoardClick();
      }}
      style={{ 
        flex: 1, 
        overflowX: 'auto', 
        overflowY: 'auto',
        display: 'flex', 
        gap: isMobile ? '8px' : '16px', // モバイル時は間隔を詰める
        alignItems: 'flex-start',
        paddingBottom: '20px',
        border: isOver ? '2px dashed #646cff' : '1px solid #333',
        borderRadius: '8px',
        padding: isMobile ? '8px' : '16px', // モバイル時は内側余白を減らす
        backgroundColor: '#1e1e1e',
        transition: 'border 0.2s',
        minHeight: '200px',
        cursor: 'default'
    }}>
      {activeTasks.length === 0 ? (
        <p style={{ color: '#666', margin: 'auto' }}>タスクを追加してください</p>
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
    activeParent,
    setActiveParentId,
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
    
    // 追加: メニュー制御
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

  // スマホ・タブレット表示判定用のState (1024px以下を対象とする)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  // 画面幅に応じた計算のために幅自体も保持
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // 追加: ドラッグ中のアイテムID
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width <= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDev = import.meta.env.DEV;

  // 余白を詰める基準 (1080px以下)
  const isCompactSpacing = windowWidth <= 1080;

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

  if (!data) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;

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
    } else if (windowWidth <= 1024) { // タブレット・PC狭め想定
        BASE_WIDTH = 200;
        INDENT_WIDTH = 20;
        CHAR_WIDTH_PX = 10;
        DEADLINE_WIDTH = 70;
    }
    // 1025px以上はデフォルト値

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
        <button onClick={(e) => { e.stopPropagation(); setShowProjectMenu(!showProjectMenu); }} style={{ padding: '0 4px', fontSize: '0.8em', background: 'transparent', border: '1px solid #555', color: '#ccc', cursor: 'pointer' }}>▼</button>
        {showProjectMenu && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: '#333', border: '1px solid #555', borderRadius: '4px', zIndex: 1000, minWidth: '200px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {projects.map(p => (
                        <div key={p.id} onClick={() => { switchProject(p.id); setShowProjectMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: p.id === activeId ? '#444' : 'transparent', borderBottom: '1px solid #444', fontSize: '0.9em' }}>{p.projectName}</div>
                    ))}
                </div>
                <div onClick={() => { addProject(); setShowProjectMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', color: '#646cff', borderTop: '1px solid #555', fontSize: '0.9em' }}>+ 新規プロジェクト</div>
                <div onClick={() => { deleteProject(activeId); setShowProjectMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', color: '#ff6b6b', fontSize: '0.9em' }}>🗑️ このプロジェクトを削除</div>
            </div>
        )}
    </div>
  );

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={customCollisionDetection} 
      onDragStart={handleDragStart} // 変更
      onDragEnd={handleDragEndWrapper} // 変更
      onDragCancel={handleDragCancel} // 追加
    >
        {/* ルートコンテナ: セーフエリア対応とパディングを追加 */}
        <div style={{ 
            maxWidth: '100%', 
            margin: '0 auto', 
            padding: isMobile ? '10px' : '20px', // モバイル時はパディングを減らす
            // セーフエリア対応 (iPhone X以降) - パディング値も動的に変更
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

          {/* 1. Header Area - スマホとPCでレイアウトを分岐 */}
          <header style={{ 
              display: 'flex', 
              // スマホでも横並び（ProjectControlsを右に置くため）
              flexDirection: 'row',
              justifyContent: 'space-between', 
              // スマホの場合は上揃え（ProjectControlsの高さと調整）
              alignItems: isMobile ? 'flex-start' : 'center', 
              flexShrink: 0, 
              marginBottom: isCompactSpacing ? '5px' : '10px', // 通常時10px, コンパクト時5pxに縮小
              gap: isMobile ? '10px' : '0'
          }}>
              {isMobile ? (
                  // === スマホ用ヘッダーレイアウト (左側) ===
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {/* TaskLinkラベル (左上端) */}
                      <div style={{ fontSize: '0.85em', color: '#888' }}>TaskLink:</div>
                      
                      {/* カレンダーボタン + プロジェクト情報 */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          {/* カレンダーボタン (ラベルの下) */}
                          <button onClick={() => setShowSidebar(!showSidebar)} style={{ padding: '8px', fontSize: '1.2em', backgroundColor: showSidebar ? '#646cff' : '#333' }} title="カレンダーを表示/非表示">📅</button>
                          
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                              {/* プロジェクト名 (カレンダーボタンの横) */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span 
                                    style={{ fontSize: '1.2em', fontWeight: 'bold', textDecoration: 'underline dotted', cursor: 'pointer' }} 
                                    onClick={handleProjectNameClick}
                                  >
                                    {data.projectName}
                                  </span>
                                  {renderProjectMenu()}
                              </div>
                              
                              {/* 進捗 (プロジェクト名の下) */}
                              <span style={{ color: 'yellowgreen', fontSize: '0.9em', fontWeight: 'bold', marginTop: '4px' }}>
                                (全進捗: {projectProgress}%)
                              </span>
                          </div>
                      </div>
                  </div>
              ) : (
                  // === PC用ヘッダーレイアウト (左側) ===
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <button onClick={() => setShowSidebar(!showSidebar)} style={{ padding: '8px', fontSize: '1.2em', backgroundColor: showSidebar ? '#646cff' : '#333' }} title="カレンダーを表示/非表示">📅</button>
                      <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                              <h1 style={{ margin: 0, fontSize: '1.5em', cursor: 'pointer' }} onClick={handleProjectNameClick}>TaskLink: <span style={{ textDecoration: 'underline dotted' }}>{data.projectName}</span></h1>
                              {renderProjectMenu()}
                              <span style={{ color: 'yellowgreen', fontSize: '1.2em', fontWeight: 'bold', marginLeft: '10px' }}>(全進捗: {projectProgress}%)</span>
                          </div>
                      </div>
                  </div>
              )}

              {/* ProjectControls (右端) - スマホでもPCでも右側に表示 */}
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
          <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', gap: (showSidebar && !isMobile) ? '20px' : '0' }}>
            
            {/* Sidebar (Calendar) */}
            <div style={{ 
              flex: showSidebar ? (isMobile ? '1 0 100%' : '0 0 35%') : '0 0 0px', 
              display: 'flex', flexDirection: 'column', 
              overflow: 'hidden', 
              transition: 'flex 0.3s ease, opacity 0.3s ease', 
              opacity: showSidebar ? 1 : 0, 
              pointerEvents: showSidebar ? 'auto' : 'none',
              // 変更点: 高さを 100% にして親コンテナ(Content Body)に収める
              height: '100%', 
              minWidth: showSidebar ? (isMobile ? '100%' : '300px') : '0' 
            }}>
                {/* トグルエリア */}
                <div style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <label style={{ fontSize: '0.85em', color: '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                {/* カレンダー本体: 高さを100%確保してスクロール可能に */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0px' }}>
                    <TaskCalendar 
                        tasks={calendarTasks} 
                        // activeTasks={activeTasks} // 削除
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
                {/* アクティブな親タスク表示エリア: 非アクティブならPC/Mobile問わず詰める */}
                <div style={{ 
                  height: activeParent ? 'auto' : '0', 
                  minHeight: activeParent ? '24px' : '0',
                  marginBottom: activeParent ? '5px' : '0',
                  color: '#646cff', 
                  fontSize: '0.8em', 
                  display: 'flex', 
                  alignItems: 'center',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}>
                  {activeParent && (
                    <>子タスク追加中: [{activeParent.id}] {activeParent.name} <button onClick={() => setActiveParentId(null)} style={{ padding: '2px 6px', fontSize: '0.8em', marginLeft: '8px' }}>取消</button></>
                  )}
                </div>
                <TaskInput taskName={inputTaskName} setTaskName={setInputTaskName} dateStr={inputDateStr} setDateStr={setInputDateStr} onSubmit={() => handleAddTaskWrapper()} />
              </div>

              <BoardArea activeTasks={activeTasks} onBoardClick={handleBoardClick} isMobile={isMobile}>
                <SortableContext items={rootNodes.map(r => r.id)} strategy={horizontalListSortingStrategy}>
                    {rootNodes.map(root => {
                        const colWidth = calculateColumnWidth(root);
                        return (
                          <SortableTaskItem key={root.id} id={root.id} depth={0}>
                            <div style={{ minWidth: `${colWidth}px`, maxWidth: `${colWidth}px`, backgroundColor: '#2a2a2a', borderRadius: '8px', border: '1px solid #444', padding: '10px', display: 'flex', flexDirection: 'column', height: 'fit-content', cursor: 'grab' }}>
                                <div style={{ borderBottom: '2px solid #444', marginBottom: '8px', paddingBottom: '4px' }}>
                                    <TaskItem 
                                      task={root} tasks={data.tasks} depth={0} hasChildren={root.children.length > 0} 
                                      onStatusChange={(s) => updateTaskStatus(root.id, s)} 
                                      onParentStatusChange={updateParentStatus}
                                      onDelete={() => deleteTask(root.id)} 
                                      onRename={(newName) => renameTask(root.id, newName)} 
                                      onDeadlineChange={(dateStr) => updateTaskDeadline(root.id, dateStr)} 
                                      isExpanded={!collapsedNodeIds.has(root.id)} onToggleExpand={() => toggleNodeExpansion(root.id)}
                                      onClick={() => handleTaskClick(root)}
                                      // メニュー制御 (修正済み)
                                      isMenuOpen={menuOpenTaskId === root.id}
                                      onToggleMenu={() => setMenuOpenTaskId(prev => prev === root.id ? null : root.id)}
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
                      style={{ fontSize: '0.7em', color: '#888', background: 'transparent', border: '1px solid #444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {showDebug ? 'デバッグを隠す' : 'デバッグを表示'}
                    </button>
                  )}

                  <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', gap: '15px' }}>
                    <button
                      onClick={undo}
                      title="元に戻す (Ctrl+Z)"
                      style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', cursor: 'pointer', padding: '2px 12px', borderRadius: '4px', fontSize: '1.4em', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px' }}
                    >
                      {/* 修正: 元に戻す記号 */}
                      ↩
                    </button>
                    <button
                      onClick={redo}
                      title="やり直す (Ctrl+y)"
                      style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', cursor: 'pointer', padding: '2px 12px', borderRadius: '4px', fontSize: '1.4em', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px' }}
                    >
                      ↪
                    </button>
                  </div>
                </div>
                {isDev && showDebug && (
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    background: '#1a1a1a', 
                    borderRadius: '8px', 
                    fontSize: '0.75em', 
                    color: '#ccc',
                    maxHeight: '400px', 
                    overflowY: 'auto'
                  }}>
                    <p><b>プロジェクト名:</b> {data.projectName}</p>
                    <p><b>適用マッピング:</b> <span style={{ color: '#8ac' }}>{debugInfo.mappingInfo}</span></p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 20px', margin: '10px 0', alignItems: 'center' }}>
                      <span style={{ color: '#888' }}>変換なしJSON:</span><span style={{ fontSize: '1.1em' }}>{debugInfo.normalLen.toLocaleString()} 文字</span>
                      <span style={{ color: '#aaa' }}>圧縮直前(Base185+Swap):</span><span style={{ fontSize: '1.1em' }}>{debugInfo.intermediateLen.toLocaleString()} 文字</span>
                      <span style={{ color: '#646cff' }}>最終圧縮後(LZ):</span><span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#646cff' }}>{debugInfo.compressedLen.toLocaleString()} 文字</span>
                      <span>圧縮率:</span><span><b>{debugInfo.rate.toFixed(1)}%</b><span style={{ marginLeft: '8px', color: '#888', fontSize: '0.9em' }}>( {(100 - debugInfo.rate).toFixed(1)}% 削減 )</span></span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div><p style={{ margin: '0 0 5px 0', color: '#888' }}><b>1. 変換なしJSON (Raw):</b></p><div style={{ maxHeight: '150px', overflowY: 'auto', background: '#222', padding: '8px', borderRadius: '4px', border: '1px solid #333' }}><code style={{ wordBreak: 'break-all', color: '#aaa', fontFamily: 'monospace' }}>{debugInfo.normal}</code></div></div>
                      <div><p style={{ margin: '0 0 5px 0', color: '#aaa' }}><b>2. 圧縮直前データ (Base185 + Swap):</b></p><div style={{ maxHeight: '150px', overflowY: 'auto', background: '#222', padding: '8px', borderRadius: '4px', border: '1px solid #333' }}><code style={{ wordBreak: 'break-all', color: '#aaa', fontFamily: 'monospace' }}>{debugInfo.intermediate}</code></div></div>
                      <div><p style={{ margin: '0 0 5px 0', color: '#646cff' }}><b>3. 最終圧縮データ (LZ):</b></p><div style={{ maxHeight: '150px', overflowY: 'auto', background: '#222', padding: '8px', borderRadius: '4px', border: '1px solid #333' }}><code style={{ wordBreak: 'break-all', color: '#646cff', fontFamily: 'monospace' }}>{debugInfo.compressed}</code></div></div>
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
              backgroundColor: '#2a2a2a', 
              borderRadius: '8px', 
              border: '1px solid #646cff', 
              padding: '10px', 
              boxShadow: '0 5px 15px rgba(0,0,0,0.5)', 
              opacity: 0.9,
              cursor: 'grabbing',
              // ▼▼▼ 修正箇所 ▼▼▼
              // width: '220px' を削除または以下のように変更します
              minWidth: '220px',    // 最低限の幅は確保
              width: 'max-content', // コンテンツ（タスク名）に合わせて幅を広げる
              maxWidth: '90vw'      // 画面からはみ出さないように最大幅を制限
              // ▲▲▲ 修正箇所 ▲▲▲
            }}>
              <TaskItem 
                task={activeDragTask} 
                tasks={data.tasks} 
                depth={0} 
                // childrenの有無だけ簡易チェック
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