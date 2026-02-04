import React from 'react';
import { useAppData } from './hooks/useAppData';
import { TaskInput } from './components/TaskInput';
import { TaskItem } from './components/TaskItem';
import { ProjectControls } from './components/ProjectControls';
import type { AppData, Task } from './types';
import { mergeAppData } from './utils/merge';

function App() {
  const { data, setData, getShareUrl } = useAppData();

  if (!data) return <div style={{ padding: '20px' }}>Loading...</div>;

  // --- Actions ---

  const addTask = (name: string, deadlineOffset?: number) => {
    const newTask: Task = {
      name,
      status: 0,
      deadlineOffset,
      lastUpdated: Date.now(),
    };
    setData({
      ...data,
      tasks: [...data.tasks, newTask],
      lastSynced: Date.now()
    });
  };

  const updateTaskStatus = (taskName: string, status: 0 | 1 | 2) => {
    const newTasks = data.tasks.map(t => 
      t.name === taskName 
        ? { ...t, status, lastUpdated: Date.now() } 
        : t
    );
    setData({ ...data, tasks: newTasks, lastSynced: Date.now() });
  };

  const deleteTask = (taskName: string) => {
    if (!confirm('このタスクを削除しますか？')) return;
    const newTasks = data.tasks.filter(t => t.name !== taskName);
    setData({ ...data, tasks: newTasks, lastSynced: Date.now() });
  };

  const resetProjectDate = () => {
    if (!confirm('プロジェクト開始日を「今日」に変更しますか？\n期限の設定日数がずれる可能性があります。')) return;
    setData({ ...data, projectStartDate: Date.now(), lastSynced: Date.now() });
  };

  // --- IO Handlers ---

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      alert('共有用URLをクリップボードにコピーしました！');
    });
  };

  const handleExport = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `task-link_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const importedData = JSON.parse(json) as AppData;
        
        // マージロジックを使用して統合
        const merged = mergeAppData(data, importedData);
        setData(merged);
        alert('データを読み込み、マージしました。');
      } catch (err) {
        console.error(err);
        alert('ファイルの読み込みに失敗しました。形式を確認してください。');
      }
    };
    reader.readAsText(file);
  };

  // --- Render ---

  // 開始日の表示用フォーマット
  const startDateStr = new Date(data.projectStartDate).toLocaleDateString();

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 10px 0' }}>TaskLink</h1>
        <p style={{ color: '#888', fontSize: '0.9em' }}>
          Start Date: {startDateStr}
        </p>
      </header>

      <ProjectControls 
        onCopyLink={handleCopyLink}
        onExport={handleExport}
        onImport={handleImport}
        onResetDate={resetProjectDate}
      />

      <TaskInput onAdd={addTask} />

      <div style={{ marginTop: '20px' }}>
        {data.tasks.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>タスクがありません。追加してください。</p>
        ) : (
          data.tasks.map(task => (
            <TaskItem 
              key={task.name} 
              task={task} 
              projectStartDate={data.projectStartDate}
              onStatusChange={(status) => updateTaskStatus(task.name, status)}
              onDelete={() => deleteTask(task.name)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default App;