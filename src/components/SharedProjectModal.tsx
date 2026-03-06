import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { shortId, projectData, role, compressedData } = sharedState;
  
  const [step, setStep] = useState<1 | 2>(compressedData ? 1 : 2);
  const [selectedDataMode, setSelectedDataMode] = useState<'latest' | 'link'>('latest');
  
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!projectData || role === 'none' || role === 'error') {
      window.history.replaceState(null, '', '/');
      onClose();
    }
  }, [projectData, role, step, onClose]);

  const handleActionSelect = useCallback((action: 'open' | 'merge') => {
    let targetTasks = projectData.data?.tasks || projectData.tasks || [];
    
    if (selectedDataMode === 'link' && compressedData) {
      const decompressed = decompressData(compressedData);
      if (decompressed && decompressed.tasks) {
        targetTasks = decompressed.tasks;
      } else {
        alert(t('link_data_corrupted'));
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
      role: role, 
    };

    window.history.replaceState(null, '', `/${shortId}`);

    if (action === 'merge') {
      window.history.replaceState(null, '', `/`);
      onMergeProject(sharedData);
    } else {
      onOpenAsProject(sharedData);
    }
    onClose();
  }, [projectData, selectedDataMode, compressedData, shortId, role, onMergeProject, onOpenAsProject, onClose, t]);

  useEffect(() => {
    if (step === 2 && role === 'viewer' && projectData && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      handleActionSelect('open');
    }
  }, [step, role, projectData, handleActionSelect]);

  if (!projectData || role === 'none' || role === 'error' || (step === 2 && role === 'viewer')) {
    return null; 
  }

  const handleDataSelect = (mode: 'latest' | 'link') => {
    setSelectedDataMode(mode);
    setStep(2);
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

  if (step === 2) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', maxWidth: '400px', width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>{t('how_to_open_project')}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', margin: '4px 0' }}>{t('project_name')}: <strong style={{color: 'var(--text-primary)'}}>{projectData.projectName}</strong></p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', marginBottom: '20px' }}>{t('your_role')} <strong style={{color: 'var(--color-info)'}}>{role === 'viewer' ? t('role_view_only') : role === 'editor' ? t('role_can_edit') : t('role_owner')}</strong></p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={() => handleActionSelect('open')} style={{ padding: '12px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{t('view_edit_as_is')}</button>
            
            {role !== 'viewer' && (
              <button onClick={() => handleActionSelect('merge')} style={{ padding: '12px', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{t('merge_into_local')}</button>
            )}
          </div>

          {compressedData && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button onClick={() => setStep(1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85em' }}>
                {t('back_to_data_selection')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};