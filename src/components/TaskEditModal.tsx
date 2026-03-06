// 役割: タスクの詳細（名前、期限、状態、順番、削除）を編集するためのモーダルUI
// なぜ: タスクのプロパティ変更操作を一つの画面に集約し、モバイル・PC問わず操作しやすくするため

import React, { useState } from 'react';
import { format } from 'date-fns';
import type { Task } from '../types';

interface Props {
  task: Task;
  hasChildren: boolean;
  onClose: () => void;
  onSave: (name: string, dateStr: string, status: 0 | 1 | 2 | 3) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const TaskEditModal: React.FC<Props> = ({
  task,
  hasChildren,
  onClose,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown
}) => {
  const [name, setName] = useState(task.name);
  const initialDate = task.deadline ? format(new Date(task.deadline), 'yyyy-MM-dd') : '';
  const [dateStr, setDateStr] = useState(initialDate);
  const [status, setStatus] = useState<0 | 1 | 2 | 3>(task.status as 0 | 1 | 2 | 3);
  
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSaveClick = () => {
    // 子タスクを持ち、かつ状態が変更された場合のみ警告を表示
    if (hasChildren && status !== task.status) {
      setShowConfirm(true);
    } else {
      onSave(name, dateStr, status);
    }
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>
        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2em' }}>タスク詳細</h3>
          
          <div>
            <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>タスク名</label>
            <textarea 
              value={name} 
              onChange={e => setName(e.target.value)} 
              autoFocus 
              style={{ 
                width: '100%', 
                padding: '8px', 
                boxSizing: 'border-box', 
                marginTop: '4px', 
                borderRadius: '4px', 
                border: '1px solid var(--border-color)', 
                background: 'var(--bg-input)', 
                color: 'var(--text-primary)',
                minHeight: '80px',
                maxHeight: '200px',
                resize: 'vertical',
                overflowY: 'auto',
                fontFamily: 'inherit',
                fontSize: '1em'
              }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>期限</label>
            <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', colorScheme: 'dark' }} />
          </div>

          {/* 子タスクがある場合のみ状態一括変更ボタンを表示 */}
          {hasChildren && (
            <div>
              <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>状態（子タスクも一括変更）</label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '8px', 
                marginTop: '4px' 
              }}>
                <button 
                  onClick={() => setStatus(0)} 
                  style={{ 
                    padding: '8px', borderRadius: '4px', cursor: 'pointer', boxSizing: 'border-box', fontWeight: 'bold',
                    backgroundColor: 'var(--text-placeholder)', color: '#fff',
                    border: status === 0 ? '2px solid var(--text-primary)' : '2px solid transparent',
                    opacity: status === 0 ? 1 : 0.5 
                  }}>未着手</button>
                <button 
                  onClick={() => setStatus(1)} 
                  style={{ 
                    padding: '8px', borderRadius: '4px', cursor: 'pointer', boxSizing: 'border-box', fontWeight: 'bold',
                    backgroundColor: 'var(--color-info)', color: '#fff',
                    border: status === 1 ? '2px solid var(--text-primary)' : '2px solid transparent',
                    opacity: status === 1 ? 1 : 0.5 
                  }}>進行中</button>
                <button 
                  onClick={() => setStatus(2)} 
                  style={{ 
                    padding: '8px', borderRadius: '4px', cursor: 'pointer', boxSizing: 'border-box', fontWeight: 'bold',
                    backgroundColor: 'var(--color-success)', color: '#fff',
                    border: status === 2 ? '2px solid var(--text-primary)' : '2px solid transparent',
                    opacity: status === 2 ? 1 : 0.5 
                  }}>完了</button>
                <button 
                  onClick={() => setStatus(3)} 
                  style={{ 
                    padding: '8px', borderRadius: '4px', cursor: 'pointer', boxSizing: 'border-box', fontWeight: 'bold',
                    backgroundColor: 'var(--color-suspend)', color: '#fff',
                    border: status === 3 ? '2px solid var(--text-primary)' : '2px solid transparent',
                    opacity: status === 3 ? 1 : 0.5 
                  }}>休止</button>
              </div>
            </div>
          )}

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
              <button onClick={handleSaveClick} style={{ padding: '6px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', fontWeight: 'bold' }}>保存</button>
            </div>
          </div>
        </div>
      </div>

      {/* 子タスク一括変更時の警告モーダル */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 4001, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowConfirm(false)}>
          <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '320px', boxShadow: '0 4px 20px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '16px' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: 0, color: 'var(--color-danger-text)', fontSize: '1.1em' }}>⚠️ 子タスクの変更確認</h4>
            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-primary)', lineHeight: '1.6' }}>
              親タスクの状態を変更すると、<strong>すべての子タスクの状態も上書き</strong>されます。<br/><br/>本当によろしいですか？
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '8px 16px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={() => { setShowConfirm(false); onSave(name, dateStr, status); }} style={{ padding: '8px 16px', background: 'var(--color-danger)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>変更する</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};