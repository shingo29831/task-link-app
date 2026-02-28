import React, { useState, useEffect } from 'react';
import type { AppData, UserRole, ProjectMember } from '../types';
import { IconWarning } from './Icons';

interface Props {
  currentName: string;
  currentId: string;
  projects: AppData[];
  
  isSyncEnabled: boolean;
  isPublic: boolean;
  members: ProjectMember[];
  isAdmin: boolean;
  currentUserRole: string; 
  isCloudProject: boolean; 
  
  onClose: () => void;
  onSaveName: (newName: string) => void;
  onToggleSync: (enabled: boolean) => void;
  onTogglePublic: (isPublic: boolean) => void;
  onInviteUser: (username: string) => void;
  onChangeRole: (memberId: string, newRole: UserRole) => void;
  onRemoveMember: (memberId: string) => void;
  onDeleteProject: (isCloudDelete: boolean) => void; 
}

export const ProjectSettingsModal: React.FC<Props> = ({ 
  currentName, 
  currentId, 
  projects, 
  isSyncEnabled,
  isPublic,
  members,
  isAdmin,
  currentUserRole,
  isCloudProject,
  onClose, 
  onSaveName,
  onToggleSync,
  onTogglePublic,
  onInviteUser,
  onChangeRole,
  onRemoveMember,
  onDeleteProject
}) => {
  const [nameValue, setNameValue] = useState(currentName);
  const [nameError, setNameError] = useState('');
  
  const [inviteUsername, setInviteUsername] = useState('');

  const [showCloudDeleteModal, setShowCloudDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState('');

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

  // ★ クラウドプロジェクトである場合のみ、クラウドデータ削除ボタンを表示可能にする
  const canDeleteCloud = isCloudProject && (currentUserRole === 'owner' || currentUserRole === 'admin');
  const showLocalDelete = !(currentUserRole === 'owner' && isCloudProject);

  const handleCloudDeleteConfirm = () => {
    if (confirmName === currentName) {
      onDeleteProject(true);
    }
  };

  const handleLocalDeleteClick = () => {
    if (window.confirm('このプロジェクトをローカルから削除しますか？\n(クラウド上のデータは削除されません)')) {
      onDeleteProject(false);
    }
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
          {isAdmin ? (
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
          ) : (
            <div style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>
              {currentName}
            </div>
          )}
          {nameError && isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-danger-text)', fontSize: '0.9em', marginTop: '6px' }}>
              <IconWarning size={16} /><span>{nameError}</span>
            </div>
          )}
        </section>

        {/* 2. 同期設定セクション (管理者のみ) */}
        {isAdmin && (
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
        )}

        {/* 同期ONの時のみ表示されるセクション (管理者のみ) */}
        {isAdmin && isSyncEnabled && (
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

        {/* 6. プロジェクト削除セクション */}
        <section style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', marginTop: (isAdmin && isSyncEnabled) ? '20px' : '0' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95em', color: 'var(--color-danger-text)' }}>危険な操作</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {canDeleteCloud && (
              <button 
                onClick={() => setShowCloudDeleteModal(true)}
                style={{
                  padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--color-danger-text)', 
                  border: '1px solid var(--color-danger-text)', borderRadius: '4px', cursor: 'pointer',
                  fontSize: '0.9em', textAlign: 'center', width: 'fit-content'
                }}
              >
                クラウドデータを削除
              </button>
            )}
            
            {showLocalDelete && (
              <button 
                onClick={handleLocalDeleteClick}
                style={{
                  padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--text-secondary)', 
                  border: '1px solid var(--text-secondary)', borderRadius: '4px', cursor: 'pointer',
                  fontSize: '0.9em', textAlign: 'center', width: 'fit-content'
                }}
              >
                ローカルからプロジェクト削除
              </button>
            )}
          </div>
        </section>

      </div>

      {/* クラウドデータ削除の確認モーダル */}
      {showCloudDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowCloudDeleteModal(false)}>
          <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
             <h3 style={{ color: 'var(--color-danger-text)', margin: '0 0 10px 0' }}>クラウドからプロジェクトを削除</h3>
             <p style={{ fontSize: '0.9em', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '20px' }}>
               この操作は取り消せません。プロジェクトに関連するすべてのタスクと共有設定がクラウドから完全に削除されます。<br/><br/>
               確認のため、プロジェクト名 <strong>{currentName}</strong> を入力してください。
             </p>
             <input 
               type="text" 
               value={confirmName} 
               onChange={e => setConfirmName(e.target.value)} 
               placeholder={currentName}
               style={{ width: '100%', padding: '10px', boxSizing: 'border-box', marginBottom: '20px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '1em' }}
             />
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
               <button onClick={() => setShowCloudDeleteModal(false)} style={{ padding: '8px 16px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>キャンセル</button>
               <button onClick={handleCloudDeleteConfirm} disabled={confirmName !== currentName} style={{ padding: '8px 16px', background: 'var(--color-danger)', border: 'none', color: '#fff', borderRadius: '4px', cursor: confirmName === currentName ? 'pointer' : 'not-allowed', opacity: confirmName === currentName ? 1 : 0.5, fontWeight: 'bold' }}>完全に削除する</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};