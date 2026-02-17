import React from 'react';
import { IconPlus, IconCalendar } from './Icons';

interface Props {
  taskName: string;
  setTaskName: (val: string) => void;
  dateStr: string;
  setDateStr: (val: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const TaskAddModal: React.FC<Props> = ({ 
  taskName, setTaskName, dateStr, setDateStr, onSubmit, onClose 
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    onSubmit();
    onClose();
  };

  const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px', padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}
        onClick={stopPropagation}
      >
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>新規タスク追加</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input 
            type="text" 
            placeholder="タスクを入力..." 
            autoFocus
            value={taskName} 
            onChange={(e) => setTaskName(e.target.value)} 
            style={{ 
              width: '100%', padding: '12px', borderRadius: '8px', 
              border: '2px solid var(--border-light)', background: 'var(--bg-input)', 
              color: 'var(--text-primary)', fontSize: '16px', boxSizing: 'border-box'
            }} 
          />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button 
              type="button"
              style={{ 
                flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                background: 'var(--bg-input)', border: '2px solid var(--border-light)', 
                color: 'var(--text-primary)', padding: '12px', borderRadius: '8px',
                fontSize: '14px', cursor: 'pointer'
              }}
            >
              <IconCalendar size={20} />
              <span>{dateStr || '期限を設定しない'}</span>
            </button>
            <input 
              type="date" 
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)} 
              style={{ 
                position: 'absolute', top: 0, left: 0, width: '100%', 
                height: '100%', opacity: 0, cursor: 'pointer'
              }} 
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ 
                flex: 1, padding: '12px', backgroundColor: 'transparent', 
                color: 'var(--text-secondary)', border: '1px solid var(--border-color)', 
                borderRadius: '8px', fontWeight: 'bold' 
              }}
            >
              キャンセル
            </button>
            <button 
              type="submit" 
              disabled={!taskName.trim()} 
              style={{ 
                flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '12px', 
                backgroundColor: !taskName.trim() ? 'var(--border-light)' : 'var(--color-primary)', 
                color: '#fff', border: 'none', borderRadius: '8px', 
                cursor: !taskName.trim() ? 'not-allowed' : 'pointer', fontWeight: 'bold' 
              }}
            >
              <IconPlus size={20} />
              <span>追加</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};