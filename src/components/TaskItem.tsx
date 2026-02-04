import React from 'react';
import type { Task } from '../types';

interface Props {
  task: Task;
  projectStartDate: number;
  onStatusChange: (status: 0 | 1 | 2) => void;
  onDelete: () => void;
}

export const TaskItem: React.FC<Props> = ({ task, projectStartDate, onStatusChange, onDelete }) => {
  // ステータスのラベルと色定義
  const statusConfig = {
    0: { label: '未着手', color: '#888' },
    1: { label: '進行中', color: '#007bff' }, // 青
    2: { label: '完了', color: '#28a745' },   // 緑
  };

  const currentConfig = statusConfig[task.status];

  // 次のステータスへ進める (0 -> 1 -> 2 -> 0)
  const toggleStatus = () => {
    const nextStatus = ((task.status + 1) % 3) as 0 | 1 | 2;
    onStatusChange(nextStatus);
  };

  // 期限表示の計算
  const getDeadlineDisplay = () => {
    if (task.deadlineOffset === undefined) return null;

    const startDate = new Date(projectStartDate);
    const deadlineDate = new Date(startDate.getTime() + task.deadlineOffset * 86400000); // 1日=86400000ms
    const today = new Date();
    
    // 時間を無視して日付だけで比較
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let color = '#888';
    let text = `あと ${diffDays} 日`;

    if (diffDays < 0) {
      color = '#dc3545'; // 赤 (期限切れ)
      text = `${Math.abs(diffDays)}日 超過`;
    } else if (diffDays === 0) {
      color = '#ffc107'; // 黄 (当日)
      text = '今日まで';
    }

    return <span style={{ color, fontSize: '0.85em', marginLeft: '10px' }}>{text}</span>;
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      padding: '8px 0', 
      borderBottom: '1px solid #333' 
    }}>
      {/* ステータスボタン */}
      <button 
        onClick={toggleStatus}
        style={{ 
          marginRight: '12px', 
          backgroundColor: currentConfig.color,
          color: '#fff',
          minWidth: '80px',
          fontSize: '0.8em',
          padding: '4px 8px'
        }}
      >
        {currentConfig.label}
      </button>

      {/* タスク名 */}
      <div style={{ flex: 1, textAlign: 'left' }}>
        <span style={{ 
          textDecoration: task.status === 2 ? 'line-through' : 'none',
          opacity: task.status === 2 ? 0.6 : 1
        }}>
          {task.name}
        </span>
        {getDeadlineDisplay()}
      </div>

      {/* 削除ボタン */}
      <button 
        onClick={onDelete}
        style={{ 
          marginLeft: '10px', 
          backgroundColor: 'transparent', 
          border: '1px solid #555',
          color: '#888',
          padding: '2px 8px'
        }}
      >
        ✕
      </button>
    </div>
  );
};