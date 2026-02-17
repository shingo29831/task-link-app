import React from 'react';
import { IconPlus } from './Icons';

interface Props {
  taskName: string;
  setTaskName: (val: string) => void;
  dateStr: string;
  setDateStr: (val: string) => void;
  onSubmit: () => void;
}

export const TaskInput: React.FC<Props> = ({ taskName, setTaskName, dateStr, setDateStr, onSubmit }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    onSubmit();
  };

  const stopPropagation = (e: React.PointerEvent) => { e.stopPropagation(); };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginBottom: '20px', alignItems: 'center', width: '100%' }}>
      <input 
        type="text" 
        placeholder="新しいタスクを入力..." 
        value={taskName} 
        onChange={(e) => setTaskName(e.target.value)} 
        onPointerDown={stopPropagation} 
        style={{ flex: 1, minWidth: 0, padding: '10px', borderRadius: '4px', border: '2px solid var(--border-light)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '16px' }} 
      />

      {/* PC表示用の期限入力 */}
      <input 
        type="date" 
        value={dateStr} 
        onChange={(e) => setDateStr(e.target.value)} 
        onPointerDown={stopPropagation} 
        style={{ 
          width: 'auto', 
          flex: '0 0 auto', 
          padding: '10px', 
          borderRadius: '4px', 
          border: '2px solid var(--border-light)', 
          background: 'var(--bg-input)', 
          color: 'var(--text-primary)', 
          colorScheme: 'dark', 
          fontSize: '16px', 
          cursor: 'pointer' 
        }} 
      />

      <button type="submit" disabled={!taskName.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 20px', backgroundColor: !taskName.trim() ? 'var(--border-light)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: !taskName.trim() ? 'not-allowed' : 'pointer', fontWeight: 'bold', flexShrink: 0, whiteSpace: 'nowrap' }}>
        <IconPlus size={20} />
        <span style={{ marginLeft: '4px' }}>追加</span>
      </button>
    </form>
  );
};