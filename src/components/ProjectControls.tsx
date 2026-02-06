import React, { useRef } from 'react';

interface Props {
  onCopyLink: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export const ProjectControls: React.FC<Props> = ({ onCopyLink, onExport, onImport}) => {
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