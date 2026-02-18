import React from 'react';
import { IconX } from './Icons';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '15px', 
            right: '15px', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            color: 'var(--text-secondary)' 
          }}
        >
          <IconX />
        </button>
        
        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '5px' }}>
          <h2 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Meld Task について</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontWeight: 500 }}>
            URLですべての状態を保存・共有する、<br/>サーバーレスなタスク管理アプリ
          </p>
          
          <div style={sectionStyle}>
            <h3 style={headerStyle}><span style={{ marginRight: '8px' }}>💡</span> 特徴</h3>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <strong style={strongStyle}>データベース不要</strong>
                <p style={pStyle}>ユーザー登録やログインは一切不要です。データはサーバーに保存されません。</p>
              </li>
              <li style={listItemStyle}>
                <strong style={strongStyle}>URLに全てを保存</strong>
                <p style={pStyle}>タスクの内容も進捗も、すべてURLの中に圧縮して保存されます。ブックマークすればそれがセーブデータです。</p>
              </li>
              <li style={listItemStyle}>
                <strong style={strongStyle}>「その瞬間」を共有</strong>
                <p style={pStyle}>URLをコピーして送るだけで、今のタスク状況をそのまま相手に共有できます。相手が見ても、あなたの手元のデータには影響しません（スナップショット共有）。</p>
              </li>
              <li style={listItemStyle}>
                <strong style={strongStyle}>マージ機能</strong>
                <p style={pStyle}>共有されたURLやJSONデータを読み込み、自分の手元のプロジェクトに統合（マージ）することができます。</p>
              </li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h3 style={headerStyle}><span style={{ marginRight: '8px' }}>🚀</span> 使い方</h3>
            <ol style={listStyle}>
              <li style={listItemStyle}><strong>タスクを作成</strong>: https://meld-task.com を開いてタスクを追加・編集します。</li>
              <li style={listItemStyle}><strong>保存</strong>: ブラウザのブックマークに登録するか、JSONとしてダウンロードして保存します。</li>
              <li style={listItemStyle}><strong>共有</strong>: URLをコピーして送るか、JSONファイルを共有します。受け取った相手はそれを読み込むことでタスクを確認・マージできます。</li>
            </ol>
          </div>

          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9em' }}>
            <p>
              <strong>⚠️ 重要: プロジェクトとデータの範囲について</strong><br/>
              生成されるURLやJSONデータは、現在選択されているプロジェクト単位で保存されます。プロジェクトを切り替えると、別のURLやJSONが出力されます。
            </p>
          </div>
          
          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <p>
              App URL: <a href="https://meld-task.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>meld-task.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'var(--overlay-bg)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1100
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-modal)',
  padding: '2rem',
  borderRadius: '12px',
  width: '90%',
  maxWidth: '600px',
  maxHeight: '85vh',
  position: 'relative',
  boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
  color: 'var(--text-primary)',
  display: 'flex',
  flexDirection: 'column'
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '2rem'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  color: 'var(--color-primary)', // accent-color の代わり
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '0.5rem',
  marginBottom: '1rem',
  fontSize: '1.2em'
};

const listStyle: React.CSSProperties = {
  paddingLeft: '1.2rem',
  margin: 0
};

const listItemStyle: React.CSSProperties = {
  marginBottom: '1rem',
  lineHeight: 1.6
};

const strongStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-primary)',
  marginBottom: '0.2rem'
};

const pStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.95rem',
  color: 'var(--text-secondary)'
};