import React, { useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';

interface Props {
  onAdd: (name: string, deadlineOffset?: number) => void;
  projectStartDate: number;
}

export const TaskInput: React.FC<Props> = ({ onAdd, projectStartDate }) => {
  const [text, setText] = useState('');
  const [dateStr, setDateStr] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    let offset: number | undefined;
    if (dateStr) {
      // dateStr は "YYYY-MM-DD" 形式
      const [y, m, d] = dateStr.split('-').map(Number);
      // ローカル時間の0時0分としてDateオブジェクトを作成
      const targetDate = new Date(y, m - 1, d);
      // プロジェクト開始日との差分（日数）を計算
      offset = differenceInCalendarDays(targetDate, projectStartDate);
    }

    onAdd(text, offset);
    
    setText('');
    setDateStr('');
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
        type="date"
        value={dateStr}
        onChange={(e) => setDateStr(e.target.value)}
        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', background: '#333', color: '#fff', colorScheme: 'dark' }}
      />
      <button type="submit" disabled={!text.trim()}>追加</button>
    </form>
  );
};