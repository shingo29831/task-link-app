import React, { useState } from 'react';

interface Props {
  onAdd: (name: string, deadlineOffset?: number) => void;
}

export const TaskInput: React.FC<Props> = ({ onAdd }) => {
  const [text, setText] = useState('');
  const [days, setDays] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const offset = days ? parseInt(days, 10) : undefined;
    onAdd(text, offset);
    
    setText('');
    setDays('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
      <input
        type="text"
        placeholder="新しいタスクを入力..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #555', background: '#333', color: '#fff' }}
      />
      <input
        type="number"
        placeholder="期限(日後)"
        value={days}
        onChange={(e) => setDays(e.target.value)}
        style={{ width: '80px', padding: '8px', borderRadius: '4px', border: '1px solid #555', background: '#333', color: '#fff' }}
      />
      <button type="submit" disabled={!text.trim()}>追加</button>
    </form>
  );
};