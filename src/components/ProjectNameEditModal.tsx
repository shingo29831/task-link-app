import React, { useState, useEffect } from 'react';
import type { AppData } from '../types';
import { IconWarning } from './Icons';

interface Props {
  currentName: string;
  currentId: string;
  projects: AppData[];
  onClose: () => void;
  onSave: (newName: string) => void;
}

export const ProjectNameEditModal: React.FC<Props> = ({ currentName, currentId, projects, onClose, onSave }) => {
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState('');

  // 入力値が変わるたびに重複チェックを実行
  useEffect(() => {
    if (!value.trim()) {
      setError('プロジェクト名を入力してください');
      return;
    }
    
    // 自分以外のプロジェクトで同じ名前があるかチェック
    const isDuplicate = projects.some(p => p.id !== currentId && p.projectName === value);
    
    if (isDuplicate) {
      setError('他のプロジェクト名で使用しています。');
    } else {
      setError('');
    }
  }, [value, currentId, projects]);

  const handleSave = () => {
    if (error || !value.trim()) return;
    onSave(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
     <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'var(--overlay-bg)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 2000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'var(--bg-surface)', padding: '20px', borderRadius: '8px',
        width: '400px', maxWidth: '90%', color: 'var(--text-primary)', boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          プロジェクト名の変更
        </h3>
        
        <input 
          type="text" 
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="プロジェクト名"
          style={{ 
            width: '100%', padding: '10px', borderRadius: '4px', 
            border: error ? '2px solid var(--color-danger)' : '1px solid var(--border-light)', 
            backgroundColor: 'var(--bg-input)', 
            color: 'var(--text-primary)', fontSize: '1em', boxSizing: 'border-box',
            outline: 'none'
          }}
        />
        
        {/* エラーメッセージ（赤文字） */}
        <div style={{ minHeight: '1.5em', marginTop: '8px' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-danger-text)', fontSize: '0.9em', fontWeight: 'bold' }}>
              <IconWarning size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-button)', color: 'var(--text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            キャンセル
          </button>
          <button 
            onClick={handleSave} 
            disabled={!!error || !value.trim()}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: (error || !value.trim()) ? 'var(--border-light)' : 'var(--color-info)', 
              color: '#fff', border: 'none', borderRadius: '4px', 
              cursor: (error || !value.trim()) ? 'not-allowed' : 'pointer',
              opacity: (error || !value.trim()) ? 0.6 : 1,
              fontWeight: 'bold'
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};