import React, { useState, useEffect } from 'react';
import type { AppData } from '../types';

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
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 2000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px',
        width: '400px', maxWidth: '90%', color: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
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
            border: error ? '2px solid #ff6b6b' : '1px solid #555', 
            backgroundColor: '#1a1a1a', 
            color: '#fff', fontSize: '1em', boxSizing: 'border-box',
            outline: 'none'
          }}
        />
        
        {/* エラーメッセージ（赤文字） */}
        <div style={{ minHeight: '1.5em', marginTop: '8px' }}>
          {error && (
            <p style={{ color: '#ff6b6b', fontSize: '0.9em', margin: 0, fontWeight: 'bold' }}>
              ⚠️ {error}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', backgroundColor: '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            キャンセル
          </button>
          <button 
            onClick={handleSave} 
            disabled={!!error || !value.trim()}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: (error || !value.trim()) ? '#555' : '#007bff', 
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