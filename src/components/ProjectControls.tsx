import React, { useRef, useState } from 'react';

interface Props {
  onCopyLink: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onImportFromUrl: (url: string) => void;
  // onOptimize を削除
}

export const ProjectControls: React.FC<Props> = ({ onCopyLink, onExport, onImport, onImportFromUrl }) => { // onOptimize を削除
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
      e.target.value = ''; // Reset input
      setShowModal(false); // ファイル選択後にモーダルを閉じる
    }
  };

  const handleUrlImport = () => {
    if (!urlInput.trim()) return;
    onImportFromUrl(urlInput);
    setUrlInput('');
    setShowModal(false);
  };

  return (
    <>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '10px', 
        padding: '15px', 
        backgroundColor: '#2a2a2a', 
        borderRadius: '8px',
        marginBottom: '5px'
      }}>
        <button onClick={onCopyLink} style={{ backgroundColor: '#646cff' }}>
          🔗 リンクをコピー
        </button>
        
        {/* 統合されたボタン */}
        <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#333' }}>
          ⬆⬇ 出力 / 読み込み
        </button>

        {/* リンク最適化ボタンを削除 */}

        <input 
          type="file" 
          accept=".json" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange} 
        />
      </div>

      {/* 入出力選択モーダル */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000
        }} onClick={() => setShowModal(false)}>
          <div style={{
            backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px',
            width: '400px', maxWidth: '90%', color: '#fff',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }} onClick={e => e.stopPropagation()}>
            
            <h3 style={{ margin: 0, borderBottom: '1px solid #444', paddingBottom: '10px' }}>データの出力 / 読み込み</h3>

            {/* ファイル操作セクション */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#aaa' }}>ファイル操作 (.json)</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={onExport} style={{ flex: 1, backgroundColor: '#333' }}>
                  ⬆ ファイル出力
                </button>
                <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, backgroundColor: '#333' }}>
                  ⬇ ファイル読み込み
                </button>
              </div>
            </div>

            {/* URL読み込みセクション */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#aaa' }}>共有URLから読み込み</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://.../?d=..."
                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#1a1a1a', color: '#fff' }}
                />
                <button onClick={handleUrlImport} style={{ backgroundColor: '#007bff' }}>
                  読み込み
                </button>
              </div>
              <p style={{ fontSize: '0.75em', color: '#888', marginTop: '5px' }}>
                ※共有リンクに含まれるデータを現在の環境にインポートします。
              </p>
            </div>

            <button onClick={() => setShowModal(false)} style={{ marginTop: '10px', backgroundColor: '#555' }}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
};