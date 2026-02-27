import React from 'react';
import type { AppData } from '../types';
import { decompressData } from '../utils/compression';

type Props = {
  sharedState: {
    shortId: string;
    projectData: any;
    role: string;
    compressedData: string | null;
  };
  onClose: () => void;
  onOpenAsProject: (data: AppData) => void;
  onMergeProject: (data: AppData) => void;
};

export const SharedProjectModal: React.FC<Props> = ({ sharedState, onClose, onOpenAsProject, onMergeProject }) => {
  const { shortId, projectData, role, compressedData } = sharedState;

  // 権限エラー、またはプロジェクトが見つからない場合のエラーモーダル
  if (!projectData || role === 'none' || role === 'error') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
          <h3 style={{ color: 'var(--color-danger-text)', marginTop: 0 }}>アクセスエラー</h3>
          <p style={{ color: 'var(--text-primary)', lineHeight: '1.5' }}>
            {role === 'error' ? 'データの読み込みに失敗しました。' : 'このプロジェクトを閲覧する権限がありません。'}
          </p>
          <button 
            onClick={() => { window.history.replaceState(null, '', '/'); onClose(); }} 
            style={{ padding: '10px 20px', marginTop: '20px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            トップへ戻る
          </button>
        </div>
      </div>
    );
  }

  // 正常にプロジェクトが取得できた場合の選択アクション
  const handleSelect = (mode: 'latest' | 'link', action: 'open' | 'merge') => {
    let targetTasks = projectData.data?.tasks || projectData.tasks || [];
    
    if (mode === 'link' && compressedData) {
      const decompressed = decompressData(compressedData);
      if (decompressed && decompressed.tasks) {
        targetTasks = decompressed.tasks;
      } else {
        alert("リンクのデータが破損しています。最新データを表示します。");
      }
    }

    const sharedData: AppData = {
      id: projectData.id,
      shortId: shortId,
      projectName: projectData.projectName,
      tasks: targetTasks,
      lastSynced: Date.now(),
      isCloudSync: true,
      isPublic: projectData.isPublic,
      publicRole: projectData.publicRole || role,
    };

    window.history.replaceState(null, '', `/${shortId}`);

    if (action === 'merge') {
      window.history.replaceState(null, '', `/`);
      onMergeProject(sharedData);
    } else {
      onOpenAsProject(sharedData);
    }
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', maxWidth: '500px', width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
        <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>共有プロジェクトを開く</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', margin: '4px 0' }}>プロジェクト名: <strong style={{color: 'var(--text-primary)'}}>{projectData.projectName}</strong></p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', marginBottom: '20px' }}>あなたの権限: <strong style={{color: 'var(--color-info)'}}>{role === 'viewer' ? '閲覧のみ' : role === 'editor' ? '編集可能' : 'オーナー'}</strong></p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1em', color: 'var(--text-primary)' }}>【1】このままプロジェクトとして開く</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => handleSelect('latest', 'open')} style={{ flex: 1, padding: '10px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>クラウド最新データを開く</button>
              {compressedData && (
                <button onClick={() => handleSelect('link', 'open')} style={{ flex: 1, padding: '10px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>URLリンク時のデータを開く</button>
              )}
            </div>
          </div>
          
          {role !== 'viewer' && (
            <div style={{ paddingTop: '16px', borderTop: '1px dashed var(--border-color)' }}>
               <h4 style={{ margin: '0 0 10px 0', fontSize: '1em', color: 'var(--text-primary)' }}>【2】現在のローカルデータとマージする</h4>
               <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                 <button onClick={() => handleSelect('latest', 'merge')} style={{ flex: 1, padding: '10px', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>最新データとマージ</button>
                 {compressedData && (
                   <button onClick={() => handleSelect('link', 'merge')} style={{ flex: 1, padding: '10px', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>URLリンク時データとマージ</button>
                 )}
               </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};