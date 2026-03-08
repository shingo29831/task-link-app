// src/components/SharedProjectModal.tsx
// 役割: 共有リンクからアクセスした際のプロジェクトデータの展開と表示モード選択を管理する
// なぜ: URLに含まれる過去のデータとクラウド上の最新データのどちらを表示するかユーザーに選ばせ、適切に読み込むため

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppData, Task } from '../types';
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

const areTasksIdentical = (tasks1: Task[], tasks2: Task[]) => {
  const active1 = tasks1.filter(t => !t.isDeleted);
  const active2 = tasks2.filter(t => !t.isDeleted);
  if (active1.length !== active2.length) return false;
  
  const map2 = new Map(active2.map(t => [t.id, t]));
  for (const t1 of active1) {
    const t2 = map2.get(t1.id);
    if (!t2) return false;
    if (t1.name !== t2.name) return false;
    if (t1.status !== t2.status) return false;
    if (t1.deadline !== t2.deadline) return false;
    if (t1.parentId !== t2.parentId) return false;
    if ((t1.order || 0) !== (t2.order || 0)) return false;
  }
  return true;
};

export const SharedProjectModal: React.FC<Props> = ({ sharedState, onClose, onOpenAsProject, onMergeProject }) => {
  const { t } = useTranslation();
  const { shortId, projectData, role, compressedData } = sharedState;
  
  const [step, setStep] = useState<0 | 1 | 2>(0); 
  
  const autoOpenedRef = useRef(false);

  const handleActionSelect = useCallback((action: 'open' | 'merge', mode: 'latest' | 'link', forceSyncOn = false) => {
    let targetTasks = projectData.data?.tasks || projectData.tasks || [];
    
    if (mode === 'link' && compressedData) {
      const decompressed = decompressData(compressedData);
      if (decompressed && decompressed.tasks) {
        targetTasks = decompressed.tasks;
      } else {
        alert(t('link_data_corrupted'));
      }
    }

    const isLinkData = mode === 'link' && !!compressedData;
    // なぜ: 最新データと一致した場合は、?d= を保持しつつ同期機能はONのままにするため
    const shouldDisableSync = isLinkData && !forceSyncOn;

    const sharedData: AppData = {
      id: projectData.id,
      shortId: shortId,
      projectName: projectData.projectName,
      tasks: targetTasks,
      lastSynced: Date.now(),
      isCloudSync: !shouldDisableSync, 
      isPublic: projectData.isPublic,
      publicRole: projectData.publicRole || role,
      role: role, 
      isSnapshot: shouldDisableSync, 
      includeDataInLink: !!compressedData, 
    };

    if (action === 'merge') {
      window.history.replaceState(null, '', `/`);
      onMergeProject(sharedData);
    } else {
      if (shouldDisableSync) {
         window.history.replaceState(null, '', `/${shortId}/snapshot/${window.location.search}`);
      } else {
         window.history.replaceState(null, '', `/${shortId}${window.location.search}`);
      }
      onOpenAsProject(sharedData);
    }
    onClose();
  }, [projectData, compressedData, shortId, role, onMergeProject, onOpenAsProject, onClose, t]);

  useEffect(() => {
    if (!projectData || role === 'none' || role === 'error') {
      window.history.replaceState(null, '', '/');
      onClose();
      return;
    }

    if (step === 0 && !autoOpenedRef.current) {
      if (compressedData) {
        const decompressed = decompressData(compressedData);
        const linkTasks = decompressed?.tasks || [];
        const cloudTasks = projectData.data?.tasks || projectData.tasks || [];
        
        const areIdentical = areTasksIdentical(linkTasks, cloudTasks);
        
        if (areIdentical) {
          autoOpenedRef.current = true;
          // なぜ: データが一致した場合は、同期ONのままURLの?d=設定を有効化して開く
          handleActionSelect('open', 'link', true);
        } else {
          const params = new URLSearchParams(window.location.search);
          if (!window.location.pathname.includes('/snapshot')) {
              window.history.replaceState(null, '', `/${shortId}/snapshot/?${params.toString()}`);
          }
          setStep(1);
        }
      } else {
        autoOpenedRef.current = true;
        handleActionSelect('open', 'latest');
      }
    }
  }, [projectData, role, step, compressedData, shortId, handleActionSelect, onClose]);

  if (!projectData || role === 'none' || role === 'error' || step === 0 || step === 2) {
    return null; 
  }

  const handleDataSelect = (mode: 'latest' | 'link') => {
    handleActionSelect('open', mode);
  };

  if (step === 1) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', maxWidth: '400px', width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>{t('select_data_to_display')}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', marginBottom: '20px' }}>
            {t('select_data_desc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => handleDataSelect('latest')} style={{ padding: '10px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{t('latest_cloud_data')}</button>
            <button onClick={() => handleDataSelect('link')} style={{ padding: '10px', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{t('data_at_link_time')}</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};