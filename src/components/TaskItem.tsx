import React from 'react';
import type { Task } from '../types';

interface Props {
  task: Task;
  projectStartDate: number;
  depth: number;
  hasChildren: boolean; // ★追加: 子タスクを持っているか
  onStatusChange: (status: 0 | 1 | 2) => void;
  onDelete: () => void;
  onAddSubTask: () => void;
}

export const TaskItem: React.FC<Props> = ({ 
  task, projectStartDate, depth, hasChildren,
  onStatusChange, onDelete, onAddSubTask 
}) => {
  const statusConfig = {
    0: { label: '未着手', color: '#888' },
    1: { label: '進行中', color: '#007bff' },
    2: { label: '完了', color: '#28a745' },
  };

  const currentConfig = statusConfig[task.status];

  const toggleStatus = () => {
    // 子タスクがある場合はクリックしても何もしない（一応ガード）
    if (hasChildren) return;
    const nextStatus = ((task.status + 1) % 3) as 0 | 1 | 2;
    onStatusChange(nextStatus);
  };

  const getDeadlineDisplay = () => {
    if (task.deadlineOffset === undefined) return null;
    const startDate = new Date(projectStartDate);
    const deadlineDate = new Date(startDate.getTime() + task.deadlineOffset * 86400000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let color = '#888';
    let text = `あと ${diffDays} 日`;

    if (diffDays < 0) {
      color = '#dc3545';
      text = `${Math.abs(diffDays)}日 超過`;
    } else if (diffDays === 0) {
      color = '#ffc107';
      text = '今日まで';
    }
    return <span style={{ color, fontSize: '0.85em', marginLeft: '10px' }}>{text}</span>;
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      padding: '8px 0', 
      borderBottom: '1px solid #333',
      marginLeft: `${depth * 24}px`,
      opacity: 1
    }}>
      <button 
        onClick={toggleStatus}
        disabled={hasChildren} // ★子タスクがある場合はボタンを無効化
        style={{ 
          marginRight: '12px', 
          backgroundColor: currentConfig.color,
          color: '#fff',
          minWidth: '80px',
          fontSize: '0.8em',
          padding: '4px 8px',
          cursor: hasChildren ? 'not-allowed' : 'pointer', // ★カーソルを変更
          opacity: hasChildren ? 0.7 : 1, // ★親タスクは少し透過させて「自動管理」感を出す
          border: hasChildren ? '1px dashed #fff' : '1px solid transparent'
        }}
      >
        {currentConfig.label}
      </button>

      <div style={{ flex: 1, textAlign: 'left' }}>
        <span style={{ 
          fontWeight: hasChildren ? 'bold' : 'normal', // ★親タスクを太字に
          textDecoration: task.status === 2 ? 'line-through' : 'none',
          opacity: task.status === 2 ? 0.6 : 1
        }}>
          {task.name}
        </span>
        {getDeadlineDisplay()}
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={onAddSubTask} title="サブタスクを追加" style={{ backgroundColor: 'transparent', border: '1px solid #555', color: '#888', padding: '2px 8px', fontSize: '0.9em' }}>＋</button>
        <button onClick={onDelete} title="削除" style={{ backgroundColor: 'transparent', border: '1px solid #555', color: '#888', padding: '2px 8px' }}>✕</button>
      </div>
    </div>
  );
};