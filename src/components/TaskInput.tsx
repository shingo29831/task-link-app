import React, { useState, useEffect } from 'react';

interface Props {
  taskName: string;
  setTaskName: (val: string) => void;
  dateStr: string;
  setDateStr: (val: string) => void;
  onSubmit: () => void;
}

export const TaskInput: React.FC<Props> = ({ taskName, setTaskName, dateStr, setDateStr, onSubmit }) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    onSubmit();
  };

  // 768px以下をモバイルレイアウトとする
  const isMobileLayout = windowWidth <= 768;

  return (
    <form onSubmit={handleSubmit} style={{ 
      display: 'flex', 
      flexDirection: isMobileLayout ? 'column' : 'row', 
      gap: '8px', 
      marginBottom: '20px' 
    }}>
      <input
        type="text"
        placeholder="新しいタスクを入力..."
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        style={{ 
          flex: 1, 
          padding: '10px', // タッチしやすいように少し広げる
          borderRadius: '4px', 
          border: '1px solid #555', 
          background: '#333', 
          color: '#fff',
          fontSize: '16px' // iOSでのズーム防止
        }}
      />
      <div style={{ display: 'flex', gap: '8px', flex: isMobileLayout ? '0 0 auto' : 'unset' }}>
        <input
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          style={{ 
            flex: isMobileLayout ? 1 : 'unset', // モバイル時は日付欄を広げる
            padding: '10px',
            borderRadius: '4px', 
            border: '1px solid #555', 
            background: '#333', 
            color: '#fff', 
            colorScheme: 'dark',
            fontSize: '16px'
          }}
        />
        <button 
          type="submit" 
          disabled={!taskName.trim()}
          style={{
            padding: '10px 20px',
            backgroundColor: !taskName.trim() ? '#555' : '#646cff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: !taskName.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            flexShrink: 0
          }}
        >
          追加
        </button>
      </div>
    </form>
  );
};