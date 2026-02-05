import React from 'react';
import type { Task } from '../types';

interface Props {
  task: Task;
  projectStartDate: number;
  depth: number;
  hasChildren: boolean;
  onStatusChange: (s: 0 | 1 | 2 | 3) => void;
  onDelete: () => void;
  onAddSubTask: () => void;
}

export const TaskItem: React.FC<Props> = ({ task, projectStartDate, depth, hasChildren, onStatusChange, onDelete, onAddSubTask }) => {
  const config = { 
    0: { l: '未着手', c: '#888' }, 
    1: { l: '進行中', c: '#007bff' }, 
    2: { l: '完了', c: '#28a745' },
    3: { l: '休止', c: '#6f42c1' } // 紫色に変更
  }[task.status] as any;

  const getDeadline = () => {
    if (task.deadlineOffset === undefined) return null;
    const days = Math.ceil((new Date(projectStartDate + task.deadlineOffset * 86400000).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
    const color = days < 0 ? '#dc3545' : days === 0 ? '#ffc107' : '#888';
    return <span style={{ color, fontSize: '0.8em', marginLeft: '8px' }}>{days < 0 ? `${Math.abs(days)}日超過` : days === 0 ? '今日まで' : `あと${days}日`}</span>;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #333', marginLeft: `${depth * 24}px` }}>
      <button 
        disabled={hasChildren} 
        onClick={() => onStatusChange(((task.status + 1) % 4) as 0|1|2|3)}
        style={{ marginRight: '12px', backgroundColor: config.c, color: '#fff', minWidth: '80px', fontSize: '0.75em', cursor: hasChildren ? 'not-allowed' : 'pointer', opacity: hasChildren ? 0.6 : 1, border: hasChildren ? '1px dashed #fff' : 'none', padding: '4px 8px' }}
      >
        {config.l}
      </button>
      {/* 修正箇所: wordBreakとwhiteSpaceを追加 */}
      <div style={{ flex: 1, textAlign: 'left', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
        <span style={{ fontSize: '0.7em', color: '#555', marginRight: '8px', fontFamily: 'monospace' }}>{task.id}</span>
        <span style={{ fontWeight: hasChildren ? 'bold' : 'normal', textDecoration: task.status === 2 ? 'line-through' : 'none', opacity: (task.status === 2 || task.status === 3) ? 0.6 : 1 }}>{task.name}</span>
        {getDeadline()}
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={onAddSubTask} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '2px 8px' }}>＋</button>
        <button onClick={onDelete} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '2px 8px' }}>✕</button>
      </div>
    </div>
  );
};