import React, { useRef } from 'react';

interface Props {
  onCopyLink: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onOptimize: () => void; // 追加: 最適化ボタン用コールバック
}

export const ProjectControls: React.FC<Props> = ({ onCopyLink, onExport, onImport, onOptimize }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '10px', 
      padding: '15px', 
      backgroundColor: '#2a2a2a', 
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <button onClick={onCopyLink} style={{ backgroundColor: '#646cff' }}>
        🔗 リンクをコピー
      </button>
      
      <button onClick={onExport} style={{ backgroundColor: '#333' }}>
        ⬇ ファイルに保存
      </button>
      
      <button onClick={() => fileInputRef.current?.click()} style={{ backgroundColor: '#333' }}>
        ⬆ ファイル読込
      </button>

      <button onClick={onOptimize} style={{ backgroundColor: '#d9534f' }} title="削除済みデータを完全消去してIDを整理します">
        🧹 リンク最適化
      </button>

      <input 
        type="file" 
        accept=".json" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
      />

    </div>
  );
};