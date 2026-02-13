import React, { useRef, useState } from 'react';
import { useResponsive } from '../hooks/useResponsive';
import { IconLink, IconArrowUp, IconArrowDown, IconInputOutput, IconHelp } from './Icons';
import { HelpModal } from './HelpModal';

interface Props {
  onCopyLink: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onImportFromUrl: (url: string) => void;
}

export const ProjectControls: React.FC<Props> = ({ onCopyLink, onExport, onImport, onImportFromUrl }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  
  const { windowWidth, isNarrowLayout } = useResponsive();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
      e.target.value = ''; // Reset input
      setShowModal(false);
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
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '20px', 
        marginTop: '15px',
        alignItems: 'center',
        justifyContent: 'flex-end'
      }}>
        
        {/* ヘルプボタン */}
        <button 
          onClick={() => setShowHelp(true)} 
          style={{ 
            backgroundColor: 'transparent', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '5px'
          }} 
          title="ヘルプ"
        >
          <IconHelp size={24} />
        </button>

        {/* リンクコピーボタン */}
        {!isNarrowLayout && (
          <button onClick={onCopyLink} style={{ backgroundColor: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }} title="リンクをコピー">
            <IconLink size={18} />
            <span>{windowWidth < 1280 ? "リンク" : "リンクをコピー"}</span>
          </button>
        )}
        
        {/* 入出力ボタン */}
        <button onClick={() => setShowModal(true)} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }} title="データの出力 / 読み込み">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <IconInputOutput size={14} />
          </div>
          <span>{isNarrowLayout ? "" : (windowWidth < 1280 ? "入出力" : "出力 / 読み込み")}</span>
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
          backgroundColor: 'var(--overlay-bg)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000
        }} onClick={() => setShowModal(false)}>
          <div style={{
            backgroundColor: 'var(--bg-surface)', padding: '20px', borderRadius: '8px',
            width: '400px', maxWidth: '90%', color: 'var(--text-primary)',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }} onClick={e => e.stopPropagation()}>
            
            <h3 style={{ margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>メニュー</h3>

            {isNarrowLayout && (
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: 'var(--text-placeholder)' }}>共有</h4>
                <button 
                  onClick={() => { onCopyLink(); setShowModal(false); }} 
                  style={{ width: '100%', backgroundColor: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <IconLink size={18} /> リンクをコピー
                </button>
              </div>
            )}

            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: 'var(--text-placeholder)' }}>ファイル操作 (.json)</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={onExport} style={{ flex: 1, backgroundColor: 'var(--bg-button)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <IconArrowUp size={16} /> ファイル出力
                </button>
                <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, backgroundColor: 'var(--bg-button)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <IconArrowDown size={16} /> ファイル読み込み
                </button>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: 'var(--text-placeholder)' }}>共有URLから読み込み</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://meld-task.com/?d=..."
                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
                <button onClick={handleUrlImport} style={{ backgroundColor: 'var(--color-info)', color: '#fff' }}>
                  読み込み
                </button>
              </div>
              <p style={{ fontSize: '0.75em', color: 'var(--text-secondary)', marginTop: '5px' }}>
                ※共有リンクに含まれるデータを現在の環境にインポートします。
              </p>
            </div>

            <button onClick={() => setShowModal(false)} style={{ marginTop: '10px', backgroundColor: 'var(--border-light)', color: 'var(--text-primary)' }}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
};