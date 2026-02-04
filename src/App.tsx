import React, { useState } from 'react';
import { useAppData } from './hooks/useAppData';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { ProjectControls } from './components/ProjectControls';
import type { AppData, Task } from './types';
import { mergeAppData } from './utils/merge';

type TaskWithChildren = Task & { children: TaskWithChildren[] };

function App() {
  const { data, setData, getShareUrl } = useAppData();
  const [parentForNewTask, setParentForNewTask] = useState<{id: string, name: string} | undefined>(undefined);

  if (!data) return <div style={{ padding: '20px' }}>Loading...</div>;

  // --- Logic for Auto-Status Calculation ---

  const recalculateStatuses = (tasks: Task[]): Task[] => {
    // ステータスを書き換えるため、一旦コピーを作る
    const newTasks = [...tasks];
    let changed = true;

    // 階層が深い場合があるため、変更がなくなるまで繰り返す（ボトムアップ計算）
    while (changed) {
      changed = false;
      for (let i = 0; i < newTasks.length; i++) {
        const task = newTasks[i];
        const children = newTasks.filter(t => t.parentId === task.id);
        
        if (children.length > 0) {
          let nextStatus: 0 | 1 | 2 = 0;

          if (children.every(c => c.status === 2)) {
            // 全て完了なら完了 (2)
            nextStatus = 2;
          } else if (children.every(c => c.status === 0)) {
            // 全て未着手なら未着手 (0)
            nextStatus = 0;
          } else {
            // それ以外（一つでも進行中がある、または未着手と完了が混ざっている）なら進行中 (1)
            nextStatus = 1;
          }

          if (task.status !== nextStatus) {
            newTasks[i] = { ...task, status: nextStatus, lastUpdated: Date.now() };
            changed = true;
          }
        }
      }
    }
    return newTasks;
  };

  const updateAndSave = (newTasks: Task[]) => {
    const finalTasks = recalculateStatuses(newTasks);
    setData({
      ...data,
      tasks: finalTasks,
      lastSynced: Date.now()
    });
  };

  // --- Actions ---

  const addTask = (name: string, deadlineOffset?: number) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      name,
      status: 0,
      deadlineOffset,
      lastUpdated: Date.now(),
      parentId: parentForNewTask?.id,
    };
    updateAndSave([...data.tasks, newTask]);
    setParentForNewTask(undefined);
  };

  const updateTaskStatus = (taskId: string, status: 0 | 1 | 2) => {
    const newTasks = data.tasks.map(t => 
      t.id === taskId ? { ...t, status, lastUpdated: Date.now() } : t
    );
    updateAndSave(newTasks);
  };

  const deleteTask = (taskId: string) => {
    if (!confirm('このタスクを削除しますか？')) return;
    const newTasks = data.tasks.filter(t => t.id !== taskId);
    updateAndSave(newTasks);
  };

  // --- Helpers & IO ---

  const buildTaskTree = (tasks: Task[]): TaskWithChildren[] => {
    const taskMap = new Map<string, TaskWithChildren>();
    tasks.forEach(t => taskMap.set(t.id, { ...t, children: [] }));
    const rootTasks: TaskWithChildren[] = [];
    tasks.forEach(t => {
      const node = taskMap.get(t.id)!;
      if (t.parentId && taskMap.has(t.parentId)) {
        taskMap.get(t.parentId)!.children.push(node);
      } else {
        rootTasks.push(node);
      }
    });
    return rootTasks;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl()).then(() => alert('リンクをコピーしました！'));
  };

  const handleExport = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `task-link.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string) as AppData;
        const merged = mergeAppData(data, importedData);
        updateAndSave(merged.tasks);
        alert('データを読み込みました');
      } catch (err) {
        alert('読み込み失敗');
      }
    };
    reader.readAsText(file);
  };

  // --- Render ---

  const renderTree = (nodes: TaskWithChildren[], depth: number = 0) => {
    return nodes.map(node => (
      <React.Fragment key={node.id}>
        <TaskItem 
          task={node} 
          projectStartDate={data.projectStartDate}
          depth={depth}
          hasChildren={node.children.length > 0} // ★子タスクの有無を渡す
          onStatusChange={(status) => updateTaskStatus(node.id, status)}
          onDelete={() => deleteTask(node.id)}
          onAddSubTask={() => setParentForNewTask({ id: node.id, name: node.name })}
        />
        {renderTree(node.children, depth + 1)}
      </React.Fragment>
    ));
  };

  const startDateStr = new Date(data.projectStartDate).toLocaleDateString();
  const taskTree = buildTaskTree(data.tasks);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 10px 0' }}>TaskLink</h1>
        <p style={{ color: '#888', fontSize: '0.9em' }}>Start: {startDateStr}</p>
      </header>

      <ProjectControls 
        onCopyLink={handleCopyLink}
        onExport={handleExport}
        onImport={handleImport}
        onResetDate={() => updateAndSave(data.tasks)} // 簡易的な開始日リセット（適宜調整）
      />

      <div style={{ marginBottom: '20px' }}>
        {parentForNewTask && (
          <div style={{ fontSize: '0.9em', color: '#646cff', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>親タスク: <b>{parentForNewTask.name}</b> に追加中</span>
            <button onClick={() => setParentForNewTask(undefined)} style={{ fontSize: '0.8em', padding: '2px 6px', background: '#333', color: '#fff' }}>キャンセル</button>
          </div>
        )}
        <TaskInput onAdd={addTask} />
      </div>

      <div style={{ marginTop: '20px' }}>
        {data.tasks.length === 0 ? <p style={{ textAlign: 'center', color: '#666' }}>タスクがありません</p> : renderTree(taskTree)}
      </div>
    </div>
  );
}

export default App;