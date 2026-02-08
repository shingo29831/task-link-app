import React, { useState, useMemo, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  TouchSensor, 
  useSensor, 
  useSensors, 
  pointerWithin,
  useDroppable, 
  type CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';

import { useAppData } from './hooks/useAppData';
import { useTaskOperations } from './hooks/useTaskOperations';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { ProjectControls } from './components/ProjectControls';
import { TaskCalendar } from './components/TaskCalendar';
import type { Task } from './types';
import { compressData, getIntermediateJson, from185, decompressData } from './utils/compression';
import { MAPPING_GROUPS_V0 as MAPPING_GROUPS } from './utils/versions/v0';
import { MergeModal } from './components/MergeModal';
import { SortableTaskItem } from './components/SortableTaskItem';
import { ProjectNameEditModal } from './components/ProjectNameEditModal'; // 追加

type TaskNode = Task & { children: TaskNode[] };

// ボード領域コンポーネント
const BoardArea = ({ children, activeTasks }: { children: React.ReactNode, activeTasks: Task[] }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'root-board',
  });

  return (
    <div 
      ref={setNodeRef}
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
        minHeight: '200px'
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
    data, 
    setData, 
    incomingData, 
    setIncomingData, 
    getShareUrl,
    projects,
    activeId,
    addProject,
    importNewProject,
    switchProject,
    deleteProject
  } = useAppData();
  
  const { 
    addTask, 
    deleteTask, 
    renameTask, 
    updateTaskStatus, 
    updateTaskDeadline, 
    updateProjectStartDate, 
    optimizeData, 
    handleDragEnd 
  } = useTaskOperations(data, setData);

  const [parent, setParent] = useState<{id: string, name: string} | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isEditingStartDate, setIsEditingStartDate] = useState(false);
  
  // プロジェクト切り替えメニュー用state
  const [showProjectMenu, setShowProjectMenu] = useState(false);

  // プロジェクト名変更モーダル用state (追加)
  const [showRenameModal, setShowRenameModal] = useState(false);

  // 開閉状態管理
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());

  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setCollapsedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const [inputTaskName, setInputTaskName] = useState('');
  const [inputDateStr, setInputDateStr] = useState('');

  const lastPointerX = useRef<number | null>(null);
  const moveDirection = useRef<'left' | 'right' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
        activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeTasks = useMemo(() => {
    return data ? data.tasks.filter(t => !t.isDeleted) : [];
  }, [data]);

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

  // マージ対象となるローカルデータを決定する
  const targetLocalData = useMemo(() => {
    if (!incomingData || !projects || !data) return null;
    
    // 1. プロジェクト名が一致する既存プロジェクトを探す
    const sameNameProject = projects.find(p => p.projectName === incomingData.projectName);
    if (sameNameProject) return sameNameProject;

    // 2. IDが一致する既存プロジェクトを探す（念のため）
    const sameIdProject = projects.find(p => p.id === incomingData.id);
    if (sameIdProject) return sameIdProject;

    // 3. どちらもなければ現在開いているプロジェクトと比較
    return data;
  }, [incomingData, projects, data]);

  // URLからインポートするハンドラー
  const handleImportFromUrl = useCallback((urlStr: string) => {
    try {
      // 完全なURLでなければ、現在のオリジンを付与して解析を試みる
      const targetUrl = urlStr.startsWith('http') ? urlStr : `${window.location.origin}${urlStr.startsWith('/') ? '' : '/'}${urlStr}`;
      const url = new URL(targetUrl);
      const compressed = url.searchParams.get('d');
      
      if (!compressed) {
        alert('URLに有効なデータ(dパラメータ)が含まれていません。');
        return;
      }

      const incoming = decompressData(compressed);
      if (incoming) {
        setIncomingData(incoming);
      } else {
        alert('データの復元に失敗しました。URLが正しいか確認してください。');
      }
    } catch (e) {
      console.error(e);
      alert('URLの形式が正しくありません。');
    }
  }, [setIncomingData]);

  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const { pointerCoordinates } = args;

    if (pointerCoordinates) {
      if (lastPointerX.current !== null) {
        const diff = pointerCoordinates.x - lastPointerX.current;
        if (diff > 0) moveDirection.current = 'right';
        else if (diff < 0) moveDirection.current = 'left';
      }
      lastPointerX.current = pointerCoordinates.x;
    }

    const pointerCollisions = pointerWithin(args);
    
    const nestCollisions = pointerCollisions.filter((collision) => 
      String(collision.id).startsWith('nest-')
    );
    if (nestCollisions.length > 0) {
      return nestCollisions;
    }

    const sortableCollisions = pointerCollisions.filter(c => c.data?.droppableContainer?.data?.current?.type === 'task');

    if (sortableCollisions.length > 0) {
      const target = sortableCollisions[0];
      const targetData = target.data?.droppableContainer?.data?.current;

      if (targetData && targetData.depth === 0) {
        const rect = target.data?.droppableContainer?.rect?.current;
        
        if (rect && pointerCoordinates) {
            const relativeX = (pointerCoordinates.x - rect.left) / rect.width;
            const direction = moveDirection.current;

            if (direction === 'right') {
                if (relativeX < 0.85) return [];
            }
            else if (direction === 'left') {
                if (relativeX > 0.15) return [];
            }
        }
        return sortableCollisions;
      }
    }

    const collisions = closestCenter(args);

    if (collisions.length === 0) {
        const board = pointerCollisions.find(c => c.id === 'root-board');
        if (board) return [board];
    }

    return collisions;
  }, []);

  // デバッグ情報の計算
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
          if (group) {
            mappingInfo = `[ID:${groupId}] ${group.name}`;
          } else {
            mappingInfo = `ID:${groupId} (Undefined)`;
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse mapping group", e);
    }
    
    const compressed = compressData(data);
    const rate = normal.length > 0 ? (compressed.length / normal.length) * 100 : 0;
    
    return { 
      normal, 
      intermediate,
      compressed, 
      normalLen: normal.length, 
      intermediateLen: intermediate.length,
      compressedLen: compressed.length, 
      rate,
      mappingInfo
    };
  }, [data]);

  const projectProgress = useMemo(() => {
    if (!data || activeTasks.length === 0) return 0;
    const parentIds = new Set(activeTasks.map(t => t.parentId).filter(Boolean));
    const leafTasks = activeTasks.filter(t => !parentIds.has(t.id));

    let total = 0;
    let count = 0;

    leafTasks.forEach(t => {
      total += t.status === 2 ? 100 : t.status === 1 ? 50 : 0;
      count++;
    });

    if (count === 0) return 0;
    return Math.round(total / count);
  }, [data, activeTasks]);

  // ダブルクリックでモーダル表示 (変更)
  const handleProjectNameDoubleClick = () => {
    if (!data) return;
    setShowRenameModal(true);
  };

  if (!data) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;

  const handleAddTaskWrapper = (targetParentId?: string) => {
    if (!inputTaskName.trim()) return;

    let offset: number | undefined;
    if (inputDateStr) {
      const [y, m, d] = inputDateStr.split('-').map(Number);
      const targetDate = new Date(y, m - 1, d);
      offset = Math.ceil((targetDate.getTime() - data.projectStartDate) / 86400000);
    }

    addTask(inputTaskName, offset, targetParentId ?? parent?.id);
    setInputTaskName('');
    setInputDateStr('');
    setParent(null);
  };

  const handleUpdateStartDateWrapper = (dateStr: string) => {
    updateProjectStartDate(dateStr);
    setIsEditingStartDate(false);
  };

  const onTaskItemAddClick = (node: TaskNode) => {
    if (inputTaskName.trim()) {
      handleAddTaskWrapper(node.id);
    } else {
      setParent({ id: node.id, name: node.name });
    }
  };

  const getStrLen = (str: string) => {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
      len += (str.charCodeAt(i) < 256) ? 1 : 2;
    }
    return len;
  };

  const calculateColumnWidth = (node: TaskNode, depth: number = 0): number => {
    const BASE_WIDTH = 220;
    const INDENT_WIDTH = 24;
    const CHAR_WIDTH_PX = 12;
    const DEADLINE_WIDTH = 80;

    const len = getStrLen(node.name);
    const textWidth = Math.min(len, 20) * CHAR_WIDTH_PX;
    const extraWidth = node.deadlineOffset !== undefined ? DEADLINE_WIDTH : 0;
    
    let max = BASE_WIDTH + (depth * INDENT_WIDTH) + textWidth + extraWidth;

    if (node.children) {
      for (const child of node.children) {
        max = Math.max(max, calculateColumnWidth(child, depth + 1));
      }
    }
    return max;
  };

  const renderColumnChildren = (nodes: TaskNode[], depth = 0) => {
    return (
      <SortableContext 
        items={nodes.map(n => n.id)} 
        strategy={verticalListSortingStrategy}
      >
        {nodes.map(n => (
          <React.Fragment key={n.id}>
            <SortableTaskItem id={n.id} depth={depth}>
                <TaskItem 
                  task={n}
                  tasks={data.tasks} 
                  projectStartDate={data.projectStartDate} 
                  depth={depth} 
                  hasChildren={n.children.length > 0}
                  onStatusChange={(s) => updateTaskStatus(n.id, s)} 
                  onDelete={() => deleteTask(n.id)}
                  onAddSubTask={() => onTaskItemAddClick(n)}
                  onRename={(newName) => renameTask(n.id, newName)}
                  onDeadlineChange={(dateStr) => updateTaskDeadline(n.id, dateStr)}
                  isExpanded={!collapsedNodeIds.has(n.id)}
                  onToggleExpand={() => toggleNodeExpansion(n.id)}
                />
                {n.children.length > 0 && !collapsedNodeIds.has(n.id) && (
                    <div style={{ paddingLeft: '0px' }}>
                        {renderColumnChildren(n.children, depth + 1)}
                    </div>
                )}
            </SortableTaskItem>
          </React.Fragment>
        ))}
      </SortableContext>
    );
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={customCollisionDetection} 
      onDragEnd={handleDragEnd}
    >
        <div style={{ 
          maxWidth: '100%', 
          margin: '0 auto', 
          padding: '20px', 
          display: 'flex', 
          flexDirection: 'row', 
          gap: showSidebar ? '20px' : '0', 
          height: '100vh', 
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
        onClick={() => {
            if (showProjectMenu) setShowProjectMenu(false);
        }}
        >
          
          {incomingData && targetLocalData && (
            <MergeModal 
                localData={targetLocalData} 
                incomingData={incomingData} 
                onConfirm={(merged) => {
                    setData(merged);
                    if (merged.id !== activeId) {
                        switchProject(merged.id);
                    }
                    setIncomingData(null);
                    alert('マージが完了しました');
                }}
                onCancel={() => setIncomingData(null)}
                onCreateNew={importNewProject}
            />
          )}

          {/* プロジェクト名変更モーダル (追加) */}
          {showRenameModal && data && (
            <ProjectNameEditModal 
              currentName={data.projectName}
              currentId={data.id}
              projects={projects}
              onClose={() => setShowRenameModal(false)}
              onSave={(newName) => {
                setData({ ...data, projectName: newName, lastSynced: Date.now() });
                setShowRenameModal(false);
              }}
            />
          )}

          <div style={{ 
            flex: showSidebar ? '0 0 33.33%' : '0 0 0px', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'flex 0.3s ease, opacity 0.3s ease',
            opacity: showSidebar ? 1 : 0,
            pointerEvents: showSidebar ? 'auto' : 'none',
            minWidth: showSidebar ? '300px' : '0'
          }}>
            <h2 style={{ fontSize: '1.2em', textAlign: 'center', marginBottom: '10px', whiteSpace: 'nowrap' }}>期限カレンダー</h2>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <TaskCalendar 
                  tasks={data.tasks} 
                  projectStartDate={data.projectStartDate}
                />
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button 
                      onClick={() => setShowSidebar(!showSidebar)} 
                      style={{ padding: '8px', fontSize: '1.2em', backgroundColor: showSidebar ? '#646cff' : '#333' }}
                      title={showSidebar ? "カレンダーを隠す" : "カレンダーを表示"}
                    >
                      📅
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                            <h1 
                                style={{ margin: 0, fontSize: '1.5em', cursor: 'pointer' }}
                                onDoubleClick={handleProjectNameDoubleClick}
                                title="ダブルクリックでプロジェクト名を変更"
                            >
                                TaskLink: <span style={{ textDecoration: 'underline dotted' }}>{data.projectName}</span>
                            </h1>

                            {/* プロジェクト切り替えドロップダウン */}
                            <div style={{ position: 'relative' }}>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowProjectMenu(!showProjectMenu);
                                    }}
                                    style={{ padding: '0 4px', fontSize: '0.8em', background: 'transparent', border: '1px solid #555', color: '#ccc', cursor: 'pointer' }}
                                >
                                    ▼
                                </button>
                                {showProjectMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        marginTop: '4px',
                                        backgroundColor: '#333',
                                        border: '1px solid #555',
                                        borderRadius: '4px',
                                        zIndex: 1000,
                                        minWidth: '200px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                    }}>
                                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            {projects.map(p => (
                                                <div 
                                                    key={p.id}
                                                    onClick={() => {
                                                        switchProject(p.id);
                                                        setShowProjectMenu(false);
                                                    }}
                                                    style={{
                                                        padding: '8px 12px',
                                                        cursor: 'pointer',
                                                        backgroundColor: p.id === activeId ? '#444' : 'transparent',
                                                        borderBottom: '1px solid #444',
                                                        fontSize: '0.9em'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#555'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = p.id === activeId ? '#444' : 'transparent'}
                                                >
                                                    {p.projectName}
                                                </div>
                                            ))}
                                        </div>
                                        <div 
                                            onClick={() => {
                                                addProject();
                                                setShowProjectMenu(false);
                                            }}
                                            style={{ padding: '8px 12px', cursor: 'pointer', color: '#646cff', borderTop: '1px solid #555', fontSize: '0.9em' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#444'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            + 新規プロジェクト
                                        </div>
                                        <div 
                                            onClick={() => {
                                                deleteProject(activeId);
                                                setShowProjectMenu(false);
                                            }}
                                            style={{ padding: '8px 12px', cursor: 'pointer', color: '#ff6b6b', fontSize: '0.9em' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#444'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            🗑️ このプロジェクトを削除
                                        </div>
                                    </div>
                                )}
                            </div>

                            <span style={{ color: 'yellowgreen', fontSize: '1.2em', fontWeight: 'bold', marginLeft: '10px' }}>
                                (全進捗: {projectProgress}%)
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                          {isEditingStartDate ? (
                            <input
                              type="date"
                              value={format(data.projectStartDate, 'yyyy-MM-dd')}
                              onChange={(e) => handleUpdateStartDateWrapper(e.target.value)}
                              onBlur={() => setIsEditingStartDate(false)}
                              autoFocus
                              style={{ fontSize: '0.8em', color: '#888', background: 'transparent', border: '1px solid #555', borderRadius: '4px', colorScheme: 'dark' }}
                            />
                          ) : (
                            <span 
                              onClick={() => setIsEditingStartDate(true)}
                              style={{ color: '#888', fontSize: '0.8em', cursor: 'pointer', textDecoration: 'underline dotted' }}
                              title="クリックして開始日を変更"
                            >
                              開始: {new Date(data.projectStartDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                    </div>
                </div>
                <ProjectControls 
                    onCopyLink={() => navigator.clipboard.writeText(getShareUrl()).then(() => alert('コピー完了'))}
                    onExport={() => {
                      const a = document.createElement('a'); 
                      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); 
                      a.download = `${data.projectName}.json`; 
                      a.click();
                    }}
                    onImport={(f) => {
                        const r = new FileReader(); 
                        r.onload = (e) => {
                            try {
                                const incoming = JSON.parse(e.target?.result as string);
                                setIncomingData(incoming);
                            } catch(err) {
                                alert('JSONの読み込みに失敗しました');
                            }
                        }; 
                        r.readAsText(f);
                    }}
                    onImportFromUrl={handleImportFromUrl}
                    onOptimize={optimizeData}
                />
            </header>

            <div style={{ marginBottom: '20px' }}>
              {parent && <div style={{ color: '#646cff', fontSize: '0.8em', marginBottom: '5px' }}>子タスク追加中: [{parent.id}] {parent.name} <button onClick={() => setParent(null)} style={{ padding: '2px 6px', fontSize: '0.8em' }}>取消</button></div>}
              <TaskInput 
                taskName={inputTaskName}
                setTaskName={setInputTaskName}
                dateStr={inputDateStr}
                setDateStr={setInputDateStr}
                onSubmit={() => handleAddTaskWrapper()}
              />
            </div>
            
            <BoardArea activeTasks={activeTasks}>
              <SortableContext items={rootNodes.map(r => r.id)} strategy={horizontalListSortingStrategy}>
                  {rootNodes.map(root => {
                      const colWidth = calculateColumnWidth(root);
                      return (
                        <SortableTaskItem key={root.id} id={root.id} depth={0}>
                          <div style={{ 
                              minWidth: `${colWidth}px`, 
                              maxWidth: `${colWidth}px`, 
                              backgroundColor: '#2a2a2a', 
                              borderRadius: '8px', 
                              border: '1px solid #444', 
                              padding: '10px',
                              display: 'flex',
                              flexDirection: 'column',
                              height: 'fit-content',
                              cursor: 'grab'
                          }}>
                              <div style={{ borderBottom: '2px solid #444', marginBottom: '8px', paddingBottom: '4px' }}>
                                  <TaskItem 
                                      task={root}
                                      tasks={data.tasks} 
                                      projectStartDate={data.projectStartDate} 
                                      depth={0} 
                                      hasChildren={root.children.length > 0}
                                      onStatusChange={(s) => updateTaskStatus(root.id, s)} 
                                      onDelete={() => deleteTask(root.id)}
                                      onAddSubTask={() => onTaskItemAddClick(root)}
                                      onRename={(newName) => renameTask(root.id, newName)}
                                      onDeadlineChange={(dateStr) => updateTaskDeadline(root.id, dateStr)}
                                      isExpanded={!collapsedNodeIds.has(root.id)}
                                      onToggleExpand={() => toggleNodeExpansion(root.id)}
                                  />
                              </div>
                              <div style={{ paddingLeft: '4px', cursor: 'auto' }}>
                                  {!collapsedNodeIds.has(root.id) && renderColumnChildren(root.children, 0)}
                              </div>
                          </div>
                        </SortableTaskItem>
                      );
                  })}
              </SortableContext>
            </BoardArea>

            <div style={{ marginTop: '10px' }}>
              <button onClick={() => setShowDebug(!showDebug)} style={{ fontSize: '0.7em', color: '#888', background: 'transparent', border: '1px solid #444' }}>
                {showDebug ? 'デバッグを隠す' : 'デバッグを表示'}
              </button>
              {showDebug && (
                <div style={{ marginTop: '15px', padding: '15px', background: '#1a1a1a', borderRadius: '8px', fontSize: '0.75em', color: '#ccc' }}>
                  <p><b>プロジェクト名:</b> {data.projectName}</p>
                  <p><b>適用マッピング:</b> <span style={{ color: '#8ac' }}>{debugInfo.mappingInfo}</span></p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 20px', margin: '10px 0', alignItems: 'center' }}>
                    <span style={{ color: '#888' }}>変換なしJSON:</span>
                    <span style={{ fontSize: '1.1em' }}>{debugInfo.normalLen.toLocaleString()} 文字</span>

                    <span style={{ color: '#aaa' }}>圧縮直前(Base185+Swap):</span>
                    <span style={{ fontSize: '1.1em' }}>{debugInfo.intermediateLen.toLocaleString()} 文字</span>
                    
                    <span style={{ color: '#646cff' }}>最終圧縮後(LZ):</span>
                    <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#646cff' }}>{debugInfo.compressedLen.toLocaleString()} 文字</span>
                    
                    <span>圧縮率:</span>
                    <span>
                      <b>{debugInfo.rate.toFixed(1)}%</b> 
                      <span style={{ marginLeft: '8px', color: '#888', fontSize: '0.9em' }}>
                        ( {(100 - debugInfo.rate).toFixed(1)}% 削減 )
                      </span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <p style={{ margin: '0 0 5px 0', color: '#888' }}><b>1. 変換なしJSON (Raw):</b></p>
                      <div style={{ maxHeight: '150px', overflowY: 'auto', background: '#222', padding: '8px', borderRadius: '4px', border: '1px solid #333' }}>
                        <code style={{ wordBreak: 'break-all', color: '#aaa', fontFamily: 'monospace' }}>
                          {debugInfo.normal}
                        </code>
                      </div>
                    </div>

                    <div>
                      <p style={{ margin: '0 0 5px 0', color: '#aaa' }}><b>2. 圧縮直前データ (Base185 + Swap):</b></p>
                      <div style={{ maxHeight: '150px', overflowY: 'auto', background: '#222', padding: '8px', borderRadius: '4px', border: '1px solid #333' }}>
                        <code style={{ wordBreak: 'break-all', color: '#aaa', fontFamily: 'monospace' }}>
                          {debugInfo.intermediate}
                        </code>
                      </div>
                    </div>

                    <div>
                      <p style={{ margin: '0 0 5px 0', color: '#646cff' }}><b>3. 最終圧縮データ (LZ):</b></p>
                      <div style={{ maxHeight: '150px', overflowY: 'auto', background: '#222', padding: '8px', borderRadius: '4px', border: '1px solid #333' }}>
                        <code style={{ wordBreak: 'break-all', color: '#646cff', fontFamily: 'monospace' }}>
                          {debugInfo.compressed}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
    </DndContext>
  );
}

export default App;