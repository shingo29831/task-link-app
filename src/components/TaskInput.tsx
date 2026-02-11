import React from 'react';
import { useResponsive } from '../hooks/useResponsive';

interface Props {
  taskName: string;
  setTaskName: (val: string) => void;
  dateStr: string;
  setDateStr: (val: string) => void;
  onSubmit: () => void;
}

export const TaskInput: React.FC<Props> = ({ taskName, setTaskName, dateStr, setDateStr, onSubmit }) => {
  // フックからフラグを取得
  const { isNarrowLayout } = useResponsive();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    onSubmit();
  };

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
          border: '2px solid var(--border-light)', 
          background: 'var(--bg-input)', 
          color: 'var(--text-primary)',
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
          border: '2px solid var(--border-light)', 
          background: 'var(--bg-input)', 
          color: 'var(--text-primary)', 
          colorScheme: 'dark', // CSS変数が反映されない場合があるので必要に応じてtheme.cssで上書きが必要かも
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
          backgroundColor: !taskName.trim() ? 'var(--border-light)' : 'var(--color-primary)',
          color: '#fff', // ボタンは白文字維持
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