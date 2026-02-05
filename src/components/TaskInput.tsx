import React from 'react';

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

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
      <input
        type="text"
        placeholder="新しいタスクを入力..."
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #555', background: '#333', color: '#fff' }}
      />
      <input
        type="date"
        value={dateStr}
        onChange={(e) => setDateStr(e.target.value)}
        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', background: '#333', color: '#fff', colorScheme: 'dark' }}
      />
      <button type="submit" disabled={!taskName.trim()}>追加</button>
    </form>
  );
};