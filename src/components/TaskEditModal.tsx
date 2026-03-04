// 役割: タスクの詳細（名前、期限、順番、削除）を編集するためのモーダルUI
// なぜ: タスクのプロパティ変更操作を一つの画面に集約し、モバイル・PC問わず操作しやすくするため

import React, { useState } from 'react';
import { format } from 'date-fns';
import type { Task } from '../types';

interface Props {
  task: Task;
  onClose: () => void;
  onSave: (name: string, dateStr: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const TaskEditModal: React.FC<Props> = ({
  task,
  onClose,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown
}) => {
  const [name, setName] = useState(task.name);
  const initialDate = task.deadline ? format(new Date(task.deadline), 'yyyy-MM-dd') : '';
  const [dateStr, setDateStr] = useState(initialDate);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2em' }}>タスク詳細</h3>
        
        <div>
          <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>タスク名</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
        </div>

        <div>
          <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>期限</label>
          <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', colorScheme: 'dark' }} />
        </div>

        <div>
           <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>順番の変更</label>
           <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
             <button onClick={onMoveUp} style={{ flex: 1, padding: '8px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>↑ 上へ</button>
             <button onClick={onMoveDown} style={{ flex: 1, padding: '8px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>↓ 下へ</button>
           </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'center' }}>
          <button onClick={() => { if(confirm('本当に削除しますか？')) { onDelete(); } }} style={{ padding: '6px 12px', background: 'transparent', color: 'var(--color-danger-text)', border: '1px solid var(--color-danger-text)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}>削除</button>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.9em' }}>キャンセル</button>
            <button onClick={() => { onSave(name, dateStr); }} style={{ padding: '6px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', fontWeight: 'bold' }}>保存</button>
          </div>
        </div>
      </div>
    </div>
  );
};