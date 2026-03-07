import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../hooks/useResponsive';
import { IconLink, IconArrowUp, IconArrowDown, IconInputOutput} from './Icons';

interface Props {
  onCopyLink: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onImportFromUrl: (url: string) => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export const ProjectControls: React.FC<Props> = ({ onCopyLink, onExport, onImport, onImportFromUrl, showModal, setShowModal }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  
  const { windowWidth, isNarrowLayout } = useResponsive();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
      e.target.value = ''; 
      setShowModal(false);
    }
  };

  const handleUrlImport = () => {
    if (!urlInput.trim()) return;
    onImportFromUrl(urlInput);
    setUrlInput('');
    setShowModal(false);
  };

  return (
    <>

      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '20px', 
        marginTop: '15px',
        alignItems: 'center',
        justifyContent: 'flex-end'
      }}>
        
        {!isNarrowLayout && (
          <button onClick={onCopyLink} style={{ backgroundColor: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }} title={t('copy_link')}>
            <IconLink size={18} />
            <span>{windowWidth < 1280 ? t('link') : t('copy_link')}</span>
          </button>
        )}
        
        {!isNarrowLayout && (
          <button onClick={() => setShowModal(true)} style={{ backgroundColor: 'var(--bg-button)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }} title={t('export_import')}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <IconInputOutput size={14} />
            </div>
            <span>{windowWidth < 1280 ? t('io') : t('export_import')}</span>
          </button>
        )}

        <input 
          type="file" 
          accept=".json" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange} 
        />
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'var(--overlay-bg)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000
        }} onClick={() => setShowModal(false)}>
          <div style={{
            backgroundColor: 'var(--bg-modal)', padding: '20px', borderRadius: '8px',
            width: '400px', maxWidth: '90%', color: 'var(--text-primary)',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }} onClick={e => e.stopPropagation()}>
            
            <h3 style={{ margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>{t('menu')}</h3>

            {isNarrowLayout && (
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: 'var(--text-placeholder)' }}>{t('share')}</h4>
                <button 
                  onClick={() => { onCopyLink(); setShowModal(false); }} 
                  style={{ width: '100%', backgroundColor: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <IconLink size={18} /> {t('copy_link')}
                </button>
              </div>
            )}

            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: 'var(--text-placeholder)' }}>{t('file_operations')}</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={onExport} style={{ flex: 1, backgroundColor: 'var(--bg-button)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <IconArrowUp size={16} /> {t('export_file')}
                </button>
                <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, backgroundColor: 'var(--bg-button)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <IconArrowDown size={16} /> {t('import_file')}
                </button>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: 'var(--text-placeholder)' }}>{t('import_from_url')}</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://meld-task.com/?d=..."
                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
                <button onClick={handleUrlImport} style={{ backgroundColor: 'var(--color-info)', color: '#fff' }}>
                  {t('import')}
                </button>
              </div>
              <p style={{ fontSize: '0.75em', color: 'var(--text-secondary)', marginTop: '5px' }}>
                {t('import_url_desc')}
              </p>
            </div>

            <button onClick={() => setShowModal(false)} style={{ marginTop: '10px', backgroundColor: 'var(--border-light)', color: 'var(--text-primary)' }}>
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};