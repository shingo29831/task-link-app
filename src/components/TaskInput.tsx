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

  // 変更: 省略表示の基準を 768px から 480px に変更
  const isNarrowLayout = windowWidth <= 480;

  const stopPropagation = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <form onSubmit={handleSubmit} style={{ 
      display: 'flex', 
      flexDirection: 'row', 
      gap: '8px', 
      marginBottom: '20px',
      alignItems: 'center', 
      width: '100%'
    }}>
      <input
        type="text"
        placeholder="新しいタスクを入力..."
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        onPointerDown={stopPropagation}
        style={{ 
          flex: 1, 
          minWidth: 0, 
          padding: '10px',
          borderRadius: '4px', 
          border: '1px solid #555', 
          background: '#333', 
          color: '#fff',
          fontSize: '16px'
        }}
      />
      
      <input
        type="date"
        // 480px以下の時だけクラスを付与して文字を透明にする(CSS参照)
        className={isNarrowLayout ? "date-input-mobile" : ""}
        value={dateStr}
        onChange={(e) => setDateStr(e.target.value)}
        onPointerDown={stopPropagation}
        style={{ 
          // 480px以下なら幅固定、それ以上なら中身に合わせて自動
          width: isNarrowLayout ? '44px' : 'auto',
          flex: '0 0 auto',
          padding: isNarrowLayout ? '10px 4px' : '10px',
          borderRadius: '4px', 
          border: '1px solid #555', 
          background: '#333', 
          color: '#fff', 
          colorScheme: 'dark',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      />
      
      <button 
        type="submit" 
        disabled={!taskName.trim()}
        style={{
          // パディングや最小幅も 480px 基準で切り替え
          padding: isNarrowLayout ? '10px' : '10px 20px',
          backgroundColor: !taskName.trim() ? '#555' : '#646cff',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: !taskName.trim() ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          minWidth: isNarrowLayout ? '44px' : 'auto'
        }}
      >
        {isNarrowLayout ? '＋' : '追加'}
      </button>
    </form>
  );
};