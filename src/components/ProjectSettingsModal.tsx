// 役割: プロジェクト名変更、同期設定、共有設定、メンバー管理などを行うモーダルUI
// なぜ: プロジェクト単位の設定を一元管理し、権限に応じた操作を提供するため

import { useState, useEffect } from 'react';
import type { AppData, UserRole, ProjectMember } from '../types';
import { IconWarning, IconLoader, IconCheckCircle, IconError, IconCloudUpload, IconX } from './Icons';

interface Props {
  currentName: string;
  currentId: string;
  projects: AppData[];
  
  isSyncEnabled: boolean;
  isPublic: boolean;
  includeDataInLink: boolean;
  members: ProjectMember[];
  isAdmin: boolean;
  currentUserRole: string; 
  isCloudProject: boolean; 
  syncState?: string; 
  
  onClose: () => void;
  onSaveName: (newName: string) => void;
  onToggleSync: (enabled: boolean) => void;
  onTogglePublic: (isPublic: boolean) => void;
  onToggleIncludeDataInLink: (enabled: boolean) => void;
  onInviteUser: (username: string) => void;
  onChangeRole: (memberId: string, newRole: UserRole) => void;
  onRemoveMember: (memberId: string) => void;
  onDeleteProject: (isCloudDelete: boolean) => void; 
}

// 全角文字を2、半角文字を1として文字幅を計算する関数
const getCharWidth = (str: string) => {
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    // ASCII文字（半角英数字・記号）および半角カタカナ領域は1としてカウント
    if ((c >= 0x0 && c <= 0x7f) || (c >= 0xff61 && c <= 0xff9f)) {
      width += 1;
    } else {
      width += 2;
    }
  }
  return width;
};

export const ProjectSettingsModal: React.FC<Props> = ({ 
  currentName, 
  currentId, 
  projects, 
  isSyncEnabled,
  isPublic,
  includeDataInLink,
  members,
  isAdmin,
  currentUserRole,
  isCloudProject,
  syncState, 
  onClose, 
  onSaveName,
  onToggleSync,
  onTogglePublic,
  onToggleIncludeDataInLink,
  onInviteUser,
  onChangeRole,
  onRemoveMember,
  onDeleteProject
}) => {
  const [nameValue, setNameValue] = useState(currentName);
  const [normalizedName, setNormalizedName] = useState(currentName);
  const [nameError, setNameError] = useState('');
  
  const [inviteUsername, setInviteUsername] = useState('');

  const [showCloudDeleteModal, setShowCloudDeleteModal] = useState(false);
  const [showSyncDisableModal, setShowSyncDisableModal] = useState(false);
  const [showIncludeDataModal, setShowIncludeDataModal] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  useEffect(() => {
    const convertedValue = nameValue.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
    const trimmedValue = convertedValue.trim();
    
    setNormalizedName(trimmedValue);

    if (!trimmedValue) {
      setNameError('プロジェクト名を入力してください');
      return;
    }

    // 文字幅の制限チェック (半角40文字 / 全角20文字)
    if (getCharWidth(trimmedValue) > 40) {
      setNameError('プロジェクト名は全角20文字（半角40文字）以内で入力してください');
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
    setNameValue(e.target.value);
  };

  const handleSaveName = () => {
    if (nameError || normalizedName === currentName) return;
    
    onSaveName(normalizedName);
  };

  const isSaveDisabled = !!nameError || normalizedName === currentName;

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isSaveDisabled) {
        handleSaveName();
      }
    }
  };

  const handleInvite = () => {
    if (!inviteUsername.trim()) return;
    onInviteUser(inviteUsername.trim());
    setInviteUsername('');
  };

  const handleInviteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inviteUsername.trim()) {
        handleInvite();
      }
    }
  };

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
      alignItems: 'center', zIndex: 2000, padding: '20px', boxSizing: 'border-box'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: '8px',
        width: '500px', maxWidth: '100%', color: 'var(--text-primary)', 
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)', maxHeight: '100%', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box'
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2em' }}>プロジェクト設定</h2>
            {(syncState === 'waiting' || syncState === 'syncing') && (
              <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }} title="同期待機中・同期中">
                <IconLoader size={18} />
              </div>
            )}
            {syncState === 'error' && (
              <div style={{ display: 'flex', alignItems: 'center' }} title="同期エラー">
                <IconError size={18} />
              </div>
            )}
            {syncState === 'synced' && (
              <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }} title="同期完了">
                <IconCheckCircle size={18} />
              </div>
            )}
          </div>
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
                onKeyDown={handleNameKeyDown}
                placeholder="プロジェクト名"
                maxLength={40}
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '4px', 
                  border: nameError ? '2px solid var(--color-danger)' : '1px solid var(--border-light)', 
                  backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', 
                  outline: 'none'
                }}
              />
              <button 
                onClick={handleSaveName}
                disabled={isSaveDisabled}
                style={{
                  padding: '0 16px', 
                  backgroundColor: isSaveDisabled ? 'var(--border-light)' : 'var(--color-info)', 
                  color: '#fff', 
                  border: 'none', borderRadius: '4px', 
                  cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
                  opacity: isSaveDisabled ? 0.6 : 1
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
              {isSyncEnabled ? (
                <button 
                  onClick={() => setShowSyncDisableModal(true)}
                  style={{backgroundColor: 'transparent', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', padding: '6px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9em', fontWeight: 'bold' }}
                >
                  <IconX size={16} /> 同期解除
                </button>
              ) : (
                <button 
                  onClick={() => onToggleSync(true)}
                  style={{ background: 'var(--bg-button)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', padding: '6px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9em', fontWeight: 'bold' }}
                >
                  <IconCloudUpload size={16} /> 同期する
                </button>
              )}
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
                    リンクから全てのユーザがプロジェクトにアクセスできます
                  </p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
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

            {/* 4. リンクにデータを保存設定 */}
            <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95em' }}>リンクにデータを保存</h4>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.9em' }}>{includeDataInLink ? 'オン' : 'オフ'}</span>
                  <input 
                    type="checkbox" 
                    checked={includeDataInLink} 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setShowIncludeDataModal(true);
                      } else {
                        onToggleIncludeDataInLink(false);
                      }
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </label>
              </div>
            </section>

            {/* 5. ユーザー招待 */}
            <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95em' }}>ユーザーを招待</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  onKeyDown={handleInviteKeyDown}
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

            {/* 6. 招待済みメンバー一覧と権限変更 */}
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

        {/* 7. プロジェクト削除セクション */}
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

      {/* 同期解除の確認モーダル */}
      {showSyncDisableModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowSyncDisableModal(false)}>
          <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', color: 'var(--text-primary)' }} onClick={e => e.stopPropagation()}>
             <h3 style={{ color: 'var(--color-danger-text)', margin: '0 0 10px 0' }}>クラウド同期を解除しますか？</h3>
             <p style={{ fontSize: '0.9em', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '20px' }}>
               クラウド同期をオフにすると、クラウド上のデータは削除されローカルのみの保存になります。よろしいですか？
             </p>
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
               <button onClick={() => setShowSyncDisableModal(false)} style={{ padding: '8px 16px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>キャンセル</button>
               <button onClick={() => { onToggleSync(false); setShowSyncDisableModal(false); }} style={{ padding: '8px 16px', background: 'var(--color-danger)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>解除する</button>
             </div>
          </div>
        </div>
      )}

      {/* リンクにデータを保存の説明モーダル */}
      {showIncludeDataModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowIncludeDataModal(false)}>
          <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', color: 'var(--text-primary)' }} onClick={e => e.stopPropagation()}>
             <h3 style={{ margin: '0 0 10px 0' }}>リンクにデータを保存</h3>
             <p style={{ fontSize: '0.9em', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '20px' }}>
               有効にするとリンクURLに現在のタスクデータが含まれます。<br/>
               このリンクで遷移することで、リンク生成時のタスク状況に復元することができます。
             </p>
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
               <button onClick={() => setShowIncludeDataModal(false)} style={{ padding: '8px 16px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>キャンセル</button>
               <button onClick={() => { onToggleIncludeDataInLink(true); setShowIncludeDataModal(false); }} style={{ padding: '8px 16px', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>有効にする</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};