import React from 'react';
import { 
  DndContext, 
  useDroppable, 
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

const BoardArea = ({ children, activeTasks, onBoardClick }: { children: React.ReactNode, activeTasks: Task[], onBoardClick: () => void }) => {
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
        gap: '16px', 
        alignItems: 'flex-start',
        paddingBottom: '20px',
        border: isOver ? '2px dashed #646cff' : '1px solid #333',
        borderRadius: '8px',
        padding: '16px',
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
    handleProjectNameDoubleClick,
    toggleNodeExpansion,
    undo,
    redo,
    
    // Dnd
    sensors,
    handleDragEnd,
    customCollisionDetection,
  } = useTaskOperations();

  const isDev = import.meta.env.DEV;

  if (!data) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;

  const getStrLen = (str: string) => { let len = 0; for (let i = 0; i < str.length; i++) len += (str.charCodeAt(i) < 256) ? 1 : 2; return len; };

  const calculateColumnWidth = (node: TaskNode, depth: number = 0): number => {
    const BASE_WIDTH = 220, INDENT_WIDTH = 24, CHAR_WIDTH_PX = 12, DEADLINE_WIDTH = 80;
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

  return (
    <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragEnd={handleDragEnd}>
        {/* ルートコンテナ: 縦並び (Header / Body) */}
        <div style={{ maxWidth: '100%', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box', overflow: 'hidden' }} onClick={() => { if (showProjectMenu) setShowProjectMenu(false); }}>
          
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
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button onClick={() => setShowSidebar(!showSidebar)} style={{ padding: '8px', fontSize: '1.2em', backgroundColor: showSidebar ? '#646cff' : '#333' }} title="カレンダーを表示/非表示">📅</button>
                  <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                          <h1 style={{ margin: 0, fontSize: '1.5em', cursor: 'pointer' }} onDoubleClick={handleProjectNameDoubleClick}>TaskLink: <span style={{ textDecoration: 'underline dotted' }}>{data.projectName}</span></h1>
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
                          <span style={{ color: 'yellowgreen', fontSize: '1.2em', fontWeight: 'bold', marginLeft: '10px' }}>(全進捗: {projectProgress}%)</span>
                      </div>
                  </div>
              </div>
              <ProjectControls 
                  onCopyLink={() => navigator.clipboard.writeText(getShareUrl()).then(() => alert('コピー完了'))}
                  onExport={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `${data.projectName}.json`; a.click(); }}
                  onImport={handleFileImport}
                  onImportFromUrl={handleImportFromUrl} 
              />
          </header>

          {/* 2. Content Body (Sidebar + Main) */}
          <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', gap: showSidebar ? '20px' : '0' }}>
            
            {/* Sidebar (Calendar) - 幅を画面幅の35%に変更 */}
            <div style={{ 
              flex: showSidebar ? '0 0 35%' : '0 0 0px', 
              display: 'flex', flexDirection: 'column', 
              overflow: 'hidden', 
              transition: 'flex 0.3s ease, opacity 0.3s ease', 
              opacity: showSidebar ? 1 : 0, 
              pointerEvents: showSidebar ? 'auto' : 'none', 
              minWidth: showSidebar ? '300px' : '0' 
            }}>
                {/* トグルエリア */}
                <div style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <label style={{ fontSize: '0.85em', color: '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>全プロジェクトを表示</span>
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
                <div style={{ height: 'calc(100% - 40px)', overflowY: 'auto', paddingRight: '5px' }}>
                    <TaskCalendar 
                        tasks={calendarTasks} 
                        // activeTasks={activeTasks} // 削除
                        onStatusChange={updateTaskStatus}
                        onParentStatusChange={updateParentStatus}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ marginBottom: '0px', flexShrink: 0 }}>
                <div style={{ height: '24px', marginBottom: '5px', color: '#646cff', fontSize: '0.8em', display: 'flex', alignItems: 'center' }}>
                  {activeParent && (
                    <>子タスク追加中: [{activeParent.id}] {activeParent.name} <button onClick={() => setActiveParentId(null)} style={{ padding: '2px 6px', fontSize: '0.8em', marginLeft: '8px' }}>取消</button></>
                  )}
                </div>
                <TaskInput taskName={inputTaskName} setTaskName={setInputTaskName} dateStr={inputDateStr} setDateStr={setInputDateStr} onSubmit={() => handleAddTaskWrapper()} />
              </div>

              <BoardArea activeTasks={activeTasks} onBoardClick={handleBoardClick}>
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
    </DndContext>
  );
}

export default App;