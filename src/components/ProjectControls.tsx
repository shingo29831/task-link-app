import React, { useRef } from 'react';

interface Props {
  onCopyLink: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onResetDate: () => void;
}

export const ProjectControls: React.FC<Props> = ({ onCopyLink, onExport, onImport, onResetDate }) => {
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
        ⬇ JSON保存
      </button>
      
      <button onClick={() => fileInputRef.current?.click()} style={{ backgroundColor: '#333' }}>
        ⬆ JSON読込
      </button>
      <input 
        type="file" 
        accept=".json" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
      />

      <button onClick={onResetDate} style={{ marginLeft: 'auto', fontSize: '0.8em', backgroundColor: 'transparent', border: '1px solid #555' }}>
        開始日を今日に更新
      </button>
    </div>
  );
};