import React, { useEffect, useState } from 'react';
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
  
  // step 1: データソースの選択 (URLに圧縮データがある場合のみ表示)
  // step 2: 開き方の選択 (閲覧 or マージ)
  const [step, setStep] = useState<1 | 2>(compressedData ? 1 : 2);
  const [selectedDataMode, setSelectedDataMode] = useState<'latest' | 'link'>('latest');

  // フロー3: 権限エラーや非公開プロジェクトだった場合、元のプロジェクト（トップ）に即座に遷移
  useEffect(() => {
    console.log(`[SharedProjectModal] Initialization - Role: ${role}, HasData: ${!!projectData}, Step: ${step}`);
    
    if (!projectData || role === 'none' || role === 'error') {
      console.log(`[SharedProjectModal] Insufficient permissions or error. Redirecting to '/'...`);
      window.history.replaceState(null, '', '/');
      onClose();
    }
  }, [projectData, role, step, onClose]);

  if (!projectData || role === 'none' || role === 'error') {
    return null; // 遷移処理中は何のモーダルも出さない
  }

  const handleDataSelect = (mode: 'latest' | 'link') => {
    console.log(`[SharedProjectModal] Selected data mode: ${mode}`);
    setSelectedDataMode(mode);
    setStep(2);
  };

  const handleActionSelect = (action: 'open' | 'merge') => {
    console.log(`[SharedProjectModal] Action selected: ${action} with mode: ${selectedDataMode}`);
    let targetTasks = projectData.data?.tasks || projectData.tasks || [];
    
    // フロー4で「リンクのデータ」が選択された場合
    if (selectedDataMode === 'link' && compressedData) {
      console.log(`[SharedProjectModal] Decompressing link data...`);
      const decompressed = decompressData(compressedData);
      if (decompressed && decompressed.tasks) {
        targetTasks = decompressed.tasks;
        console.log(`[SharedProjectModal] Decompression successful.`);
      } else {
        alert("リンクのデータが破損しています。最新データを表示します。");
        console.warn(`[SharedProjectModal] Decompression failed. Fallback to latest tasks.`);
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

  // フロー4: 「?d=」がある場合のデータ選択モーダル
  if (step === 1) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', maxWidth: '400px', width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>表示するデータの選択</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', marginBottom: '20px' }}>
            URLにリンク共有時点でのデータが含まれています。どちらのデータを表示しますか？
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => handleDataSelect('latest')} style={{ padding: '10px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>クラウド上の最新データ</button>
            <button onClick={() => handleDataSelect('link')} style={{ padding: '10px', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>URLリンク時点のデータ</button>
          </div>
        </div>
      </div>
    );
  }

  // フロー5: アクション（マージするか、そのまま閲覧するか）の選択モーダル
  if (step === 2) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', maxWidth: '400px', width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>プロジェクトの開き方</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', margin: '4px 0' }}>プロジェクト名: <strong style={{color: 'var(--text-primary)'}}>{projectData.projectName}</strong></p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', marginBottom: '20px' }}>あなたの権限: <strong style={{color: 'var(--color-info)'}}>{role === 'viewer' ? '閲覧のみ' : role === 'editor' ? '編集可能' : 'オーナー'}</strong></p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={() => handleActionSelect('open')} style={{ padding: '12px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>このまま閲覧・編集する</button>
            
            {role !== 'viewer' && (
              <button onClick={() => handleActionSelect('merge')} style={{ padding: '12px', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>現在のローカルプロジェクトにマージ</button>
            )}
          </div>

          {compressedData && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button onClick={() => setStep(1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85em' }}>
                データ選択に戻る
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};