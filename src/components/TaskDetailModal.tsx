import React from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Task } from '../types';

interface Props {
  date: Date;
  tasks: Task[];
  onClose: () => void;
}

export const TaskDetailModal: React.FC<Props> = ({ date, tasks, onClose }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px',
        width: '300px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>{format(date, 'M月d日のタスク', { locale: ja })}</h3>
          <button onClick={onClose} style={{ padding: '2px 8px' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tasks.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.9em' }}>タスクはありません</p>
          ) : (
            tasks.map(t => (
              <div key={t.id} style={{
                padding: '8px', borderRadius: '4px', fontSize: '0.85em',
                backgroundColor: t.status === 2 ? '#28a745' : t.status === 3 ? '#6f42c1' : '#007bff',
                color: '#fff', textDecoration: t.status === 2 ? 'line-through' : 'none'
              }}>
                {t.name}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};