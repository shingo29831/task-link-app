import React, { useState, useMemo } from 'react';
import { useAppData } from './hooks/useAppData';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { ProjectControls } from './components/ProjectControls';
import type { Task, AppData } from './types';
import { mergeAppData } from './utils/merge';
import { getIntermediateJson, compressData } from './utils/compression';

type TaskNode = Task & { children: TaskNode[] };

function App() {
  // 1. フック呼び出しをコンポーネントの最上部にまとめる（エラー修正）
  const { data, setData, getShareUrl } = useAppData();
  const [parent, setParent] = useState<{id: string, name: string} | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // 2. メモ化も早期リターンの前に行う
  const debugInfo = useMemo(() => {
    if (!data) return { before: "", after: "", beforeLen: 0, afterLen: 0, ratio: "0" };
    const before = getIntermediateJson(data);
    const after = compressData(data);
    return {
      before,
      after,
      beforeLen: before.length,
      afterLen: after.length,
      ratio: before.length > 0 ? ((after.length / before.length) * 100).toFixed(1) : "0"
    };
  }, [data]);

  // 3. データがない場合の早期リターン（ここより下でフックは呼べない）
  if (!data) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;

  // --- Logic ---

  const recalculate = (tasks: Task[]): Task[] => {
    const next = [...tasks];
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < next.length; i++) {
        const children = next.filter(t => t.parentId === next[i].id);
        if (children.length > 0) {
          const s: 0|1|2 = children.every(c => c.status === 2) ? 2 : children.every(c => c.status === 0) ? 0 : 1;
          if (next[i].status !== s) {
            next[i] = { ...next[i], status: s, lastUpdated: Date.now() };
            changed = true;
          }
        }
      }
    }
    return next;
  };

  const save = (newTasks: Task[]) => setData({ ...data, tasks: recalculate(newTasks), lastSynced: Date.now() });

  const addTask = (name: string, offset?: number) => {
    // 36進数インクリメントID生成
    const maxIdNum = data.tasks.reduce((max, t) => Math.max(max, parseInt(t.id, 36) || 0), 0);
    const newId = (maxIdNum + 1).toString(36);
    save([...data.tasks, { id: newId, name, status: 0, deadlineOffset: offset, lastUpdated: Date.now(), parentId: parent?.id }]);
    setParent(null);
  };

  const buildTree = (tasks: Task[]): TaskNode[] => {
    const map = new Map<string, TaskNode>();
    tasks.forEach(t => map.set(t.id, { ...t, children: [] }));
    const roots: TaskNode[] = [];
    tasks.forEach(t => {
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
        onDelete={() => confirm('削除しますか？') && save(data.tasks.filter(t => t.id !== n.id))}
        onAddSubTask={() => setParent({ id: n.id, name: n.name })}
      />
      {renderNodes(n.children, depth + 1)}
    </React.Fragment>
  ));

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>TaskLink</h1>
        <p style={{ color: '#888', fontSize: '0.8em' }}>開始日: {new Date(data.projectStartDate).toLocaleDateString()}</p>
      </header>

      <ProjectControls 
        onCopyLink={() => navigator.clipboard.writeText(getShareUrl()).then(() => alert('コピー完了'))}
        onExport={() => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
          a.download = 'tasklink.json'; a.click();
        }}
        onImport={(f) => {
          const r = new FileReader();
          r.onload = (e) => save(mergeAppData(data, JSON.parse(e.target?.result as string) as AppData).tasks);
          r.readAsText(f);
        }}
        onResetDate={() => confirm('今日を開始日にしますか？') && setData({ ...data, projectStartDate: Date.now(), lastSynced: Date.now() })}
      />

      <div style={{ marginBottom: '20px' }}>
        {parent && (
          <div style={{ color: '#646cff', fontSize: '0.8em', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>親タスク: <b>[{parent.id}] {parent.name}</b> に追加中</span>
            <button onClick={() => setParent(null)} style={{ fontSize: '0.8em', padding: '2px 6px', background: '#333', color: '#fff' }}>取消</button>
          </div>
        )}
        <TaskInput onAdd={addTask} />
      </div>

      <div style={{ marginTop: '20px' }}>
        {data.tasks.length === 0 ? <p style={{ textAlign: 'center', color: '#666' }}>タスクがありません</p> : renderNodes(buildTree(data.tasks))}
      </div>

      {/* --- DEBUG SECTION --- */}
      <div style={{ marginTop: '60px', borderTop: '1px dashed #444', paddingTop: '20px' }}>
        <button onClick={() => setShowDebug(!showDebug)} style={{ fontSize: '0.7em', color: '#888', background: 'transparent', border: '1px solid #444' }}>
          {showDebug ? 'デバッグを隠す' : 'デバッグ（配置順圧縮情報）を表示'}
        </button>
        {showDebug && (
          <div style={{ marginTop: '15px', padding: '15px', background: '#1a1a1a', borderRadius: '8px', fontSize: '0.75em', color: '#ccc' }}>
            <p style={{ marginBottom: '5px' }}><b>1. 配置順 JSON (キーなし / {debugInfo.beforeLen} 文字):</b></p>
            <code style={{ wordBreak: 'break-all', color: '#888' }}>{debugInfo.before}</code>
            
            <p style={{ marginTop: '20px', marginBottom: '5px' }}><b>2. LZ 圧縮後 (URL エンコード済み / {debugInfo.afterLen} 文字):</b></p>
            <code style={{ wordBreak: 'break-all', color: '#646cff' }}>{debugInfo.after}</code>
            
            <p style={{ marginTop: '15px' }}>圧縮率: <b>{debugInfo.ratio}%</b></p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;