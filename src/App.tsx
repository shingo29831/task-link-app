import React, { useState, useMemo } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { useAppData } from './hooks/useAppData';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { ProjectControls } from './components/ProjectControls';
import { TaskCalendar } from './components/TaskCalendar';
import type { Task, AppData } from './types';
import { mergeAppData } from './utils/merge';
import { getIntermediateJson, compressData } from './utils/compression';

type TaskNode = Task & { children: TaskNode[] };

function App() {
  const { data, setData, getShareUrl } = useAppData();
  const [parent, setParent] = useState<{id: string, name: string} | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // TaskInputの状態をAppにリフトアップ
  const [inputTaskName, setInputTaskName] = useState('');
  const [inputDateStr, setInputDateStr] = useState('');

  const debugInfo = useMemo(() => {
    if (!data) return { before: "", after: "", beforeLen: 0, afterLen: 0 };
    const before = getIntermediateJson(data);
    const after = compressData(data);
    return { before, after, beforeLen: before.length, afterLen: after.length };
  }, [data]);


  if (!data) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;

  const activeTasks = data.tasks.filter(t => !t.isDeleted);
  const canEditProjectName = activeTasks.length === 0;

  const recalculate = (tasks: Task[]): Task[] => {
    const next = [...tasks];
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < next.length; i++) {
        if (next[i].isDeleted) continue;
        const children = next.filter(t => !t.isDeleted && t.parentId === next[i].id);
        if (children.length > 0) {
          const s: 0|1|2|3 = 
            children.every(c => c.status === 2) ? 2 : 
            children.every(c => c.status === 0) ? 0 : 
            children.every(c => c.status === 3) ? 3 : 1;
          
          if (next[i].status !== s) { next[i] = { ...next[i], status: s, lastUpdated: Date.now() }; changed = true; }
        }
      }
    }
    return next;
  };

  const save = (newTasks: Task[]) => setData({ ...data, tasks: recalculate(newTasks), lastSynced: Date.now() });

  // explicitParentId 引数を追加
  const addTask = (name: string, offset?: number, explicitParentId?: string) => {
    // 英数字を半角に変換する処理を追加
    const normalizedName = name.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    const newId = (data.tasks.length + 1).toString(36);
    const newTask: Task = { 
      id: newId, 
      name: normalizedName, // 変換後の名前を使用
      status: 0, 
      deadlineOffset: offset || undefined, 
      lastUpdated: Date.now(), 
      parentId: explicitParentId ?? parent?.id 
    };
    save([...data.tasks, newTask]);
    setParent(null);
  };

  // タスク名変更ハンドラ
  const handleRenameTask = (id: string, newName: string) => {
    if (!newName.trim()) return;
    const normalizedName = newName.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
    const newTasks = data.tasks.map(t => 
      t.id === id ? { ...t, name: normalizedName, lastUpdated: Date.now() } : t
    );
    save(newTasks);
  };

  // タスク期限変更ハンドラ
  const handleUpdateDeadline = (id: string, dateStr: string) => {
    let offset: number | undefined;
    if (dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const targetDate = new Date(y, m - 1, d);
      offset = differenceInCalendarDays(targetDate, data.projectStartDate);
    } else {
      offset = undefined;
    }

    const newTasks = data.tasks.map(t => 
      t.id === id ? { ...t, deadlineOffset: offset, lastUpdated: Date.now() } : t
    );
    save(newTasks);
  };

  // 統合されたタスク追加ハンドラ
  const handleAddTask = (targetParentId?: string) => {
    if (!inputTaskName.trim()) return;

    let offset: number | undefined;
    if (inputDateStr) {
      const [y, m, d] = inputDateStr.split('-').map(Number);
      const targetDate = new Date(y, m - 1, d);
      offset = differenceInCalendarDays(targetDate, data.projectStartDate);
    }

    addTask(inputTaskName, offset, targetParentId);
    
    // 入力をクリア
    setInputTaskName('');
    setInputDateStr('');
  };

  // タスクアイテムの+ボタンクリック時の処理
  const onTaskItemAddClick = (node: TaskNode) => {
    if (inputTaskName.trim()) {
      // 入力がある場合はそのタスクの子として即時追加
      handleAddTask(node.id);
    } else {
      // 入力がない場合は親タスク設定モードへ（従来通りの挙動）
      setParent({ id: node.id, name: node.name });
    }
  };

  const buildTree = (tasks: Task[]): TaskNode[] => {
    const map = new Map<string, TaskNode>();
    tasks.filter(t => !t.isDeleted).forEach(t => map.set(t.id, { ...t, children: [] }));
    const roots: TaskNode[] = [];
    tasks.filter(t => !t.isDeleted).forEach(t => {
      const node = map.get(t.id)!;
      if (t.parentId && map.has(t.parentId)) map.get(t.parentId)!.children.push(node);
      else roots.push(node);
    });
    return roots;
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

  const renderColumnChildren = (nodes: TaskNode[], depth = 0) => nodes.map(n => (
    <React.Fragment key={n.id}>
      <TaskItem 
        task={n} 
        projectStartDate={data.projectStartDate} 
        depth={depth} 
        hasChildren={n.children.length > 0}
        onStatusChange={(s) => save(data.tasks.map(t => t.id === n.id ? { ...t, status: s, lastUpdated: Date.now() } : t))}
        onDelete={() => confirm('削除しますか？') && save(data.tasks.map(t => t.id === n.id ? { ...t, isDeleted: true, lastUpdated: Date.now() } : t))}
        onAddSubTask={() => onTaskItemAddClick(n)}
        onRename={(newName) => handleRenameTask(n.id, newName)}
        onDeadlineChange={(dateStr) => handleUpdateDeadline(n.id, dateStr)}
      />
      {renderColumnChildren(n.children, depth + 1)}
    </React.Fragment>
  ));

  return (
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
      
      {/* 左カラム：カレンダー */}
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

      {/* 右カラム：メインコンテンツ */}
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
                    <h1 
                        style={{ 
                            margin: 0, 
                            fontSize: '1.5em', 
                            cursor: canEditProjectName ? 'pointer' : 'default',
                            textDecoration: canEditProjectName ? 'underline dotted' : 'none'
                        }}
                        onClick={() => {
                            if (!canEditProjectName) {
                                alert('タスクが存在するため、プロジェクト名は変更できません。');
                                return;
                            }
                            const newName = prompt('プロジェクト名を変更しますか？', data.projectName);
                            if (newName && newName.trim()) {
                                setData({ ...data, projectName: newName, lastSynced: Date.now() });
                            }
                        }}
                        title={canEditProjectName ? "クリックしてプロジェクト名を変更" : "タスクがあるため変更不可"}
                    >
                        TaskLink: {data.projectName}
                    </h1>
                    <span style={{ color: '#888', fontSize: '0.8em' }}>開始: {new Date(data.projectStartDate).toLocaleDateString()}</span>
                </div>
            </div>
            <ProjectControls 
                onCopyLink={() => navigator.clipboard.writeText(getShareUrl()).then(() => alert('コピー完了'))}
                onExport={() => {
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `${data.projectName}.json`; a.click();
                }}
                onImport={(f) => {
                const r = new FileReader(); 
                r.onload = (e) => {
                    const incoming = JSON.parse(e.target?.result as string) as AppData;
                    const merged = mergeAppData(data, incoming);
                    if (merged.projectName !== data.projectName && incoming.projectName !== data.projectName) {
                        alert(`プロジェクト名が一致しません。\n(現在: ${data.projectName}, 読込先: ${incoming.projectName})`);
                        return;
                    }
                    setData({ ...merged, lastSynced: Date.now() });
                }; 
                r.readAsText(f);
                }}
                onResetDate={() => confirm('今日を開始日にしますか？') && setData({ ...data, projectStartDate: Date.now(), lastSynced: Date.now() })}
            />
        </header>

        {/* 入力エリア */}
        <div style={{ marginBottom: '20px' }}>
          {parent && <div style={{ color: '#646cff', fontSize: '0.8em', marginBottom: '5px' }}>子タスク追加中: [{parent.id}] {parent.name} <button onClick={() => setParent(null)} style={{ padding: '2px 6px', fontSize: '0.8em' }}>取消</button></div>}
          <TaskInput 
            taskName={inputTaskName}
            setTaskName={setInputTaskName}
            dateStr={inputDateStr}
            setDateStr={setInputDateStr}
            onSubmit={() => handleAddTask()}
          />
        </div>

        {/* カンバンボードエリア */}
        <div style={{ 
            flex: 1, 
            overflowX: 'auto', 
            overflowY: 'auto', // 修正: hidden -> auto (縦スクロールを有効化)
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
            buildTree(data.tasks).map(root => {
                const colWidth = calculateColumnWidth(root);
                return (
                  <div key={root.id} style={{ 
                      minWidth: `${colWidth}px`, 
                      maxWidth: `${colWidth}px`, 
                      backgroundColor: '#2a2a2a', 
                      borderRadius: '8px', 
                      border: '1px solid #444', 
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      height: 'fit-content', // 修正: maxHeight: '100%' を削除し fit-content に変更
                  }}>
                      <div style={{ borderBottom: '2px solid #444', marginBottom: '8px', paddingBottom: '4px' }}>
                          <TaskItem 
                              task={root} 
                              projectStartDate={data.projectStartDate} 
                              depth={0} 
                              hasChildren={root.children.length > 0}
                              onStatusChange={(s) => save(data.tasks.map(t => t.id === root.id ? { ...t, status: s, lastUpdated: Date.now() } : t))}
                              onDelete={() => confirm('削除しますか？') && save(data.tasks.map(t => t.id === root.id ? { ...t, isDeleted: true, lastUpdated: Date.now() } : t))}
                              onAddSubTask={() => onTaskItemAddClick(root)}
                              onRename={(newName) => handleRenameTask(root.id, newName)}
                              onDeadlineChange={(dateStr) => handleUpdateDeadline(root.id, dateStr)}
                          />
                      </div>
                      <div style={{ paddingLeft: '4px' }}> {/* 修正: overflowY: 'auto', flex: 1 を削除 */}
                          {renderColumnChildren(root.children, 0)}
                      </div>
                  </div>
                );
            })
          )}
        </div>

        {/* デバッグ */}
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
  );
}

export default App;