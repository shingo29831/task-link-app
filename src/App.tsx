import React, { useState, useMemo } from 'react';
import { useAppData } from './hooks/useAppData';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { ProjectControls } from './components/ProjectControls';
import { TaskCalendar } from './components/TaskCalendar'; // カレンダーを追加
import type { Task, AppData } from './types';
import { mergeAppData } from './utils/merge';
import { getIntermediateJson, compressData } from './utils/compression';

type TaskNode = Task & { children: TaskNode[] };

function App() {
  const { data, setData, getShareUrl } = useAppData();
  const [parent, setParent] = useState<{id: string, name: string} | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const debugInfo = useMemo(() => {
    if (!data) return { before: "", after: "", beforeLen: 0, afterLen: 0 };
    const before = getIntermediateJson(data);
    const after = compressData(data);
    return { before, after, beforeLen: before.length, afterLen: after.length };
  }, [data]);

  if (!data) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;

  const recalculate = (tasks: Task[]): Task[] => {
    const next = [...tasks];
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < next.length; i++) {
        if (next[i].isDeleted) continue;
        const children = next.filter(t => !t.isDeleted && t.parentId === next[i].id);
        if (children.length > 0) {
          // 子の状態に基づきステータスを決定
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

  const addTask = (name: string, offset?: number) => {
    const newId = (data.tasks.length + 1).toString(36);
    const newTask: Task = { id: newId, name, status: 0, deadlineOffset: offset || undefined, lastUpdated: Date.now(), parentId: parent?.id };
    save([...data.tasks, newTask]);
    setParent(null);
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

  const renderNodes = (nodes: TaskNode[], depth = 0) => nodes.map(n => (
    <React.Fragment key={n.id}>
      <TaskItem 
        task={n} projectStartDate={data.projectStartDate} depth={depth} hasChildren={n.children.length > 0}
        onStatusChange={(s) => save(data.tasks.map(t => t.id === n.id ? { ...t, status: s, lastUpdated: Date.now() } : t))}
        onDelete={() => confirm('削除しますか？') && save(data.tasks.map(t => t.id === n.id ? { ...t, isDeleted: true, lastUpdated: Date.now() } : t))}
        onAddSubTask={() => setParent({ id: n.id, name: n.name })}
      />
      {renderNodes(n.children, depth + 1)}
    </React.Fragment>
  ));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'flex-start' }}>
      
      {/* 左カラム：カレンダー */}
      <div style={{ flex: '1 1 350px', minWidth: '300px', position: 'sticky', top: '20px' }}>
        <h2 style={{ fontSize: '1.2em', textAlign: 'center', marginBottom: '10px' }}>期限カレンダー</h2>
        <TaskCalendar projectStartDate={data.projectStartDate} tasks={data.tasks} />
      </div>

      {/* 右カラム：メインコンテンツ */}
      <div style={{ flex: '2 1 500px', minWidth: '300px' }}>
        <header style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1>TaskLink</h1>
          <p style={{ color: '#888', fontSize: '0.8em' }}>開始: {new Date(data.projectStartDate).toLocaleDateString()}</p>
        </header>

        <ProjectControls 
          onCopyLink={() => navigator.clipboard.writeText(getShareUrl()).then(() => alert('コピー完了'))}
          onExport={() => {
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'tasklink.json'; a.click();
          }}
          onImport={(f) => {
            const r = new FileReader(); r.onload = (e) => save(mergeAppData(data, JSON.parse(e.target?.result as string) as AppData).tasks); r.readAsText(f);
          }}
          onResetDate={() => confirm('今日を開始日にしますか？') && setData({ ...data, projectStartDate: Date.now(), lastSynced: Date.now() })}
        />

        <div style={{ marginBottom: '20px' }}>
          {parent && <div style={{ color: '#646cff', fontSize: '0.8em', marginBottom: '5px' }}>子タスク追加中: [{parent.id}] {parent.name} <button onClick={() => setParent(null)} style={{ padding: '2px 6px', fontSize: '0.8em' }}>取消</button></div>}
          <TaskInput onAdd={addTask} projectStartDate={data.projectStartDate} />
        </div>

        <div style={{ marginTop: '20px' }}>
          {data.tasks.filter(t => !t.isDeleted).length === 0 ? <p style={{ textAlign: 'center', color: '#666' }}>タスクがありません</p> : renderNodes(buildTree(data.tasks))}
        </div>

        <div style={{ marginTop: '60px', borderTop: '1px dashed #444', paddingTop: '20px' }}>
          <button onClick={() => setShowDebug(!showDebug)} style={{ fontSize: '0.7em', color: '#888', background: 'transparent', border: '1px solid #444' }}>
            {showDebug ? 'デバッグを隠す' : 'デバッグ（休止追加・極限圧縮）を表示'}
          </button>
          {showDebug && (
            <div style={{ marginTop: '15px', padding: '15px', background: '#1a1a1a', borderRadius: '8px', fontSize: '0.75em', color: '#ccc' }}>
              <p><b>1. 圧縮直前データ (不可視文字エスケープ):</b></p>
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