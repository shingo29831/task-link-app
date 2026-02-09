import React, { useRef, useState, useEffect } from 'react';

interface Props {
  onCopyLink: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onImportFromUrl: (url: string) => void;
}

export const ProjectControls: React.FC<Props> = ({ onCopyLink, onExport, onImport, onImportFromUrl }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // 画面幅の判定
  const isVeryNarrow = windowWidth < 480;

  // ボタンのテキスト設定 (1024px以下をモバイル/タブレットとして短縮)
  const getLinkButtonText = () => {
    if (windowWidth <= 1024) return "🔗 リンク";
    return "🔗 リンクをコピー";
  };

  const getIOButtonText = () => {
    if (windowWidth < 480) return "⬆⬇";
    if (windowWidth <= 1024) return "⬆⬇ 入出力";
    return "⬆⬇ 出力 / 読み込み";
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
        marginBottom: '5px',
        alignItems: 'center',
        justifyContent: 'flex-end'
      }}>
        {/* 画面幅が狭くない場合のみ、ヘッダーにリンクコピーボタンを表示 */}
        {!isVeryNarrow && (
          <button onClick={onCopyLink} style={{ backgroundColor: '#646cff' }} title="リンクをコピー">
            {getLinkButtonText()}
          </button>
        )}
        
        {/* 入出力ボタン (狭い時はこれだけ表示) */}
        <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#333' }} title="データの出力 / 読み込み">
          {getIOButtonText()}
        </button>

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
            
            <h3 style={{ margin: 0, borderBottom: '1px solid #444', paddingBottom: '10px' }}>メニュー</h3>

            {/* 画面幅が狭い場合のみ、モーダル内にリンクコピー機能を表示 */}
            {isVeryNarrow && (
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#aaa' }}>共有</h4>
                <button 
                  onClick={() => { onCopyLink(); setShowModal(false); }} 
                  style={{ width: '100%', backgroundColor: '#646cff' }}
                >
                  🔗 リンクをコピー
                </button>
              </div>
            )}

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