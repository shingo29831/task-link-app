import React, { useState, useEffect } from 'react';
import type { AppData } from '../types';
import { IconWarning } from './Icons';

// ※ ../types/index.ts に以下の型定義を追加または調整してください
export type UserRole = 'viewer' | 'editor' | 'admin';
export interface ProjectMember {
  id: string; // 内部管理用UUIDなど
  username: string;
  role: UserRole;
}

interface Props {
  currentName: string;
  currentId: string;
  projects: AppData[];
  
  // 同期・共有に関するProps
  isSyncEnabled: boolean;
  isPublic: boolean;
  members: ProjectMember[];
  
  onClose: () => void;
  onSaveName: (newName: string) => void;
  onToggleSync: (enabled: boolean) => void;
  onTogglePublic: (isPublic: boolean) => void;
  onInviteUser: (username: string) => void;
  onChangeRole: (memberId: string, newRole: UserRole) => void;
  onRemoveMember: (memberId: string) => void;
}

export const ProjectSettingsModal: React.FC<Props> = ({ 
  currentName, 
  currentId, 
  projects, 
  isSyncEnabled,
  isPublic,
  members,
  onClose, 
  onSaveName,
  onToggleSync,
  onTogglePublic,
  onInviteUser,
  onChangeRole,
  onRemoveMember
}) => {
  // プロジェクト名用のState
  const [nameValue, setNameValue] = useState(currentName);
  const [nameError, setNameError] = useState('');
  
  // 招待用のState
  const [inviteUsername, setInviteUsername] = useState('');

  // プロジェクト名の重複チェック
  useEffect(() => {
    const trimmedValue = nameValue.trim();
    if (!trimmedValue) {
      setNameError('プロジェクト名を入力してください');
      return;
    }
    const isDuplicate = projects.some(p => 
      p.id !== currentId && 
      p.projectName.trim().toLowerCase() === trimmedValue.toLowerCase()
    );
    if (isDuplicate) {
      setNameError('他のプロジェクト名で使用しています。');
    } else {
      setNameError('');
    }
  }, [nameValue, currentId, projects]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const normalizedValue = rawValue.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
    setNameValue(normalizedValue);
  };

  const handleSaveName = () => {
    if (nameError || !nameValue.trim()) return;
    if (nameValue.trim() !== currentName) {
      onSaveName(nameValue.trim());
    }
  };

  const handleInvite = () => {
    if (!inviteUsername.trim()) return;
    onInviteUser(inviteUsername.trim());
    setInviteUsername('');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'var(--overlay-bg)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 2000, overflowY: 'auto', padding: '20px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: '8px',
        width: '500px', maxWidth: '100%', color: 'var(--text-primary)', 
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '20px'
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2em' }}>プロジェクト設定</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2em' }}>
            ×
          </button>
        </div>

        {/* 1. プロジェクト名変更セクション */}
        <section>
          <h3 style={{ fontSize: '1em', margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>プロジェクト名</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              value={nameValue}
              onChange={handleNameChange}
              placeholder="プロジェクト名"
              style={{ 
                flex: 1, padding: '10px', borderRadius: '4px', 
                border: nameError ? '2px solid var(--color-danger)' : '1px solid var(--border-light)', 
                backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', 
                outline: 'none'
              }}
            />
            <button 
              onClick={handleSaveName}
              disabled={!!nameError || !nameValue.trim() || nameValue.trim() === currentName}
              style={{
                padding: '0 16px', backgroundColor: 'var(--color-info)', color: '#fff', 
                border: 'none', borderRadius: '4px', cursor: 'pointer',
                opacity: (!!nameError || !nameValue.trim() || nameValue.trim() === currentName) ? 0.5 : 1
              }}
            >
              更新
            </button>
          </div>
          {nameError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-danger-text)', fontSize: '0.9em', marginTop: '6px' }}>
              <IconWarning size={16} /><span>{nameError}</span>
            </div>
          )}
        </section>

        {/* 2. 同期設定セクション */}
        <section style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1em', margin: 0, color: 'var(--text-secondary)' }}>クラウド同期</h3>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
              <span style={{ fontSize: '0.9em' }}>{isSyncEnabled ? 'オン' : 'オフ'}</span>
              <input 
                type="checkbox" 
                checked={isSyncEnabled} 
                onChange={(e) => onToggleSync(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>
          </div>
        </section>

        {/* 同期ONの時のみ表示されるセクション */}
        {isSyncEnabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: 'var(--bg-panel)', padding: '16px', borderRadius: '6px' }}>
            
            {/* 3. 公開設定 */}
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95em' }}>全体への公開設定</h4>
                  <p style={{ margin: 0, fontSize: '0.8em', color: 'var(--text-placeholder)' }}>
                    リンクを知っている全員がプロジェクトにアクセスできるようにします
                  </p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                  <span style={{ fontSize: '0.9em' }}>{isPublic ? '公開' : '非公開'}</span>
                  <input 
                    type="checkbox" 
                    checked={isPublic} 
                    onChange={(e) => onTogglePublic(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </label>
              </div>
            </section>

            {/* 4. ユーザー招待 */}
            <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95em' }}>ユーザーを招待</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  placeholder="ユーザー名を入力"
                  style={{ 
                    flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)', 
                    backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)'
                  }}
                />
                <button 
                  onClick={handleInvite}
                  disabled={!inviteUsername.trim()}
                  style={{
                    padding: '0 16px', backgroundColor: 'var(--color-primary)', color: '#fff', 
                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                    opacity: !inviteUsername.trim() ? 0.5 : 1
                  }}
                >
                  招待
                </button>
              </div>
            </section>

            {/* 5. 招待済みメンバー一覧と権限変更 */}
            <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95em' }}>メンバー一覧</h4>
              {members.length === 0 ? (
                <p style={{ fontSize: '0.85em', color: 'var(--text-placeholder)' }}>メンバーはいません</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {members.map(member => (
                    <li key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-input)', padding: '8px 12px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{member.username}</span>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <select 
                          value={member.role}
                          onChange={(e) => onChangeRole(member.id, e.target.value as UserRole)}
                          style={{
                            padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-light)',
                            backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.85em'
                          }}
                        >
                          <option value="viewer">閲覧者</option>
                          <option value="editor">編集者</option>
                          <option value="admin">管理者</option>
                        </select>
                        <button 
                          onClick={() => onRemoveMember(member.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-danger-text)', cursor: 'pointer', fontSize: '0.85em' }}
                          title="メンバーから削除"
                        >
                          削除
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

          </div>
        )}

      </div>
    </div>
  );
};