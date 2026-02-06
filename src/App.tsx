import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  TouchSensor, 
  useSensor, 
  useSensors, 
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
import { getIntermediateJson, compressData } from './utils/compression';
import { MergeModal } from './components/MergeModal';
import { SortableTaskItem } from './components/SortableTaskItem';

type TaskNode = Task & { children: TaskNode[] };

function App() {
  const { data, setData, incomingData, setIncomingData, getShareUrl } = useAppData();
  
  const { 
    addTask, 
    deleteTask, 
    renameTask, 
    updateTaskDeadline, 
    updateProjectStartDate, 
    optimizeData, 
    handleDragEnd 
  } = useTaskOperations(data, setData);

  const [parent, setParent] = useState<{id: string, name: string} | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isEditingStartDate, setIsEditingStartDate] = useState(false);

  const [inputTaskName, setInputTaskName] = useState('');
  const [inputDateStr, setInputDateStr] = useState('');

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

  const debugInfo = useMemo(() => {
    if (!data) return { before: "", after: "", beforeLen: 0, afterLen: 0 };
    const before = getIntermediateJson(data);
    const after = compressData(data);
    return { before, after, beforeLen: before.length, afterLen: after.length };
  }, [data]);

  const activeTasks = useMemo(() => {
    return data ? data.tasks.filter(t => !t.isDeleted) : [];
  }, [data]);

  const projectProgress = useMemo(() => {
    if (!data || activeTasks.length === 0) return 0;
    const parentIds = new Set(activeTasks.map(t => t.parentId).filter(Boolean));
    const leafTasks = activeTasks.filter(t => !parentIds.has(t.id));

    let total = 0;
    let count = 0;

    leafTasks.forEach(t => {
      if (t.status !== 3) {
        total += t.status === 2 ? 100 : t.status === 1 ? 50 : 0;
        count++;
      }
    });

    if (count === 0) return 0;
    return Math.round(total / count);
  }, [data, activeTasks]);

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

    const len = getStrLen(node.name);
    const textWidth = Math.min(len, 20) * CHAR_WIDTH_PX;
    
    let max = BASE_WIDTH + (depth * INDENT_WIDTH) + textWidth;

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
            <SortableTaskItem id={n.id}>
                <TaskItem 
                  task={n}
                  tasks={data.tasks} // ★ 追加: tasksを渡す
                  projectStartDate={data.projectStartDate} 
                  depth={depth} 
                  hasChildren={n.children.length > 0}
                  onStatusChange={(s) => {
                    const newTasks = data.tasks.map(t => t.id === n.id ? { ...t, status: s, lastUpdated: Date.now() } : t);
                    setData({ ...data, tasks: newTasks, lastSynced: Date.now() });
                  }}
                  onDelete={() => deleteTask(n.id)}
                  onAddSubTask={() => onTaskItemAddClick(n)}
                  onRename={(newName) => renameTask(n.id, newName)}
                  onDeadlineChange={(dateStr) => updateTaskDeadline(n.id, dateStr)}
                />
                {n.children.length > 0 && (
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
      collisionDetection={closestCenter} 
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
        }}>
          
          {incomingData && data && (
            <MergeModal 
                localData={data} 
                incomingData={incomingData} 
                onConfirm={(merged) => {
                    setData(merged);
                    setIncomingData(null);
                    alert('マージが完了しました');
                }}
                onCancel={() => setIncomingData(null)}
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
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px' }}>
                            <h1 
                                style={{ margin: 0, fontSize: '1.5em' }}
                                title="クリックしてプロジェクト名を変更"
                            >
                                TaskLink:
                                <span 
                                  style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                                  onClick={() => {
                                      const newName = prompt('プロジェクト名を変更しますか？', data.projectName);
                                      if (newName && newName.trim()) {
                                          setData({ ...data, projectName: newName, lastSynced: Date.now() });
                                      }
                                  }}
                                >
                                  {data.projectName}
                                </span> 
                            </h1>
                            <span style={{ color: 'yellowgreen', fontSize: '1.2em', fontWeight: 'bold' }}>
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

            <div style={{ 
                flex: 1, 
                overflowX: 'auto', 
                overflowY: 'auto',
                display: 'flex', 
                gap: '16px', 
                alignItems: 'flex-start',
                paddingBottom: '20px',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#1e1e1e'
            }}>
              {activeTasks.length === 0 ? (
                <p style={{ color: '#666', margin: 'auto' }}>タスクを追加してください</p>
              ) : (
                <SortableContext items={rootNodes.map(r => r.id)} strategy={horizontalListSortingStrategy}>
                  {rootNodes.map(root => {
                      const colWidth = calculateColumnWidth(root);
                      return (
                        <SortableTaskItem key={root.id} id={root.id}>
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
                                      tasks={data.tasks} // ★ 追加: tasksを渡す
                                      projectStartDate={data.projectStartDate} 
                                      depth={0} 
                                      hasChildren={root.children.length > 0}
                                      onStatusChange={(s) => {
                                        const newTasks = data.tasks.map(t => t.id === root.id ? { ...t, status: s, lastUpdated: Date.now() } : t);
                                        setData({ ...data, tasks: newTasks, lastSynced: Date.now() });
                                      }}
                                      onDelete={() => deleteTask(root.id)}
                                      onAddSubTask={() => onTaskItemAddClick(root)}
                                      onRename={(newName) => renameTask(root.id, newName)}
                                      onDeadlineChange={(dateStr) => updateTaskDeadline(root.id, dateStr)}
                                  />
                              </div>
                              <div style={{ paddingLeft: '4px', cursor: 'auto' }}>
                                  {renderColumnChildren(root.children, 0)}
                              </div>
                          </div>
                        </SortableTaskItem>
                      );
                  })}
                </SortableContext>
              )}
            </div>

            <div style={{ marginTop: '10px' }}>
              <button onClick={() => setShowDebug(!showDebug)} style={{ fontSize: '0.7em', color: '#888', background: 'transparent', border: '1px solid #444' }}>
                {showDebug ? 'デバッグを隠す' : 'デバッグを表示'}
              </button>
              {showDebug && (
                <div style={{ marginTop: '15px', padding: '15px', background: '#1a1a1a', borderRadius: '8px', fontSize: '0.75em', color: '#ccc' }}>
                  <p><b>プロジェクト名:</b> {data.projectName}</p>
                  <p><b>1. 圧縮直前データ:</b></p>
                  <code style={{ wordBreak: 'break-all', color: '#888' }}>
                    {debugInfo.before.replace(/[\u0080-\u00FF]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)}
                  </code>
                  <p style={{ marginTop: '20px' }}><b>2. LZ 圧縮後:</b></p>
                  <code style={{ wordBreak: 'break-all', color: '#646cff' }}>{debugInfo.after}</code>
                </div>
              )}
            </div>
          </div>
        </div>
    </DndContext>
  );
}

export default App;