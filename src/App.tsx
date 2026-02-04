import React, { useState } from 'react';
import { useAppData } from './hooks/useAppData';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { ProjectControls } from './components/ProjectControls';
import type { Task, AppData } from './types';
import { mergeAppData } from './utils/merge';

type TaskNode = Task & { children: TaskNode[] };

function App() {
  const { data, setData, getShareUrl } = useAppData();
  const [parent, setParent] = useState<{id: string, name: string} | null>(null);

  if (!data) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;

  const recalculate = (tasks: Task[]): Task[] => {
    const next = [...tasks];
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < next.length; i++) {
        const children = next.filter(t => t.parentId === next[i].id);
        if (children.length > 0) {
          let s: 0|1|2 = children.every(c => c.status === 2) ? 2 : children.every(c => c.status === 0) ? 0 : 1;
          if (next[i].status !== s) { next[i] = { ...next[i], status: s, lastUpdated: Date.now() }; changed = true; }
        }
      }
    }
    return next;
  };

  const save = (newTasks: Task[]) => setData({ ...data, tasks: recalculate(newTasks), lastSynced: Date.now() });

  const addTask = (name: string, offset?: number) => {
    // ★ 36進数インクリメントID生成
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
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'tasklink.json'; a.click();
        }}
        onImport={(f) => {
          const r = new FileReader(); r.onload = (e) => save(mergeAppData(data, JSON.parse(e.target?.result as string)).tasks); r.readAsText(f);
        }}
        onResetDate={() => confirm('今日を開始日にしますか？') && setData({ ...data, projectStartDate: Date.now() })}
      />
      {parent && <div style={{ color: '#646cff', fontSize: '0.8em', marginBottom: '5px' }}>子タスク追加中: [{parent.id}] {parent.name} <button onClick={() => setParent(null)}>取消</button></div>}
      <TaskInput onAdd={addTask} />
      <div style={{ marginTop: '30px' }}>{renderNodes(buildTree(data.tasks))}</div>
    </div>
  );
}

export default App;