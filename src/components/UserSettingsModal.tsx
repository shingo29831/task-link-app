// 役割: ユーザーの個人設定（言語、タイムゾーン、テーマ、カレンダー等）を変更するモーダルUI
// なぜ: アカウントに紐づく設定をユーザー自身でカスタマイズし、データベースに保存できるようにするため

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserSettings } from '../hooks/useUserSettings';
import type { UserSettings } from '../types';

interface Props {
  onClose: () => void;
}

export const UserSettingsModal: React.FC<Props> = ({ onClose }) => {
  const { t } = useTranslation();
  const { settings: globalSettings, updateSettings } = useUserSettings();
  
  const [settings, setSettings] = useState<UserSettings>(globalSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSettings(globalSettings);
  }, [globalSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(settings);
      alert(t('settings_saved'));
      onClose();
    } catch (error) {
      alert(t('settings_failed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={onClose}>
      <div style={{ backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', color: 'var(--text-primary)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>{t('settings')}</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{t('language')}</label>
            <select value={settings.language} onChange={e => setSettings({...settings, language: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9em', fontWeight: 'bold' }}>タイムゾーン</label>
            <select value={settings.timezone} onChange={e => setSettings({...settings, timezone: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>
              <option value="Asia/Tokyo">Asia/Tokyo (日本標準時)</option>
              <option value="UTC">UTC (協定世界時)</option>
              <option value="America/New_York">America/New_York (東部標準時)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{t('theme')}</label>
            <select value={settings.theme} onChange={e => setSettings({...settings, theme: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>
              <option value="system">{t('system_default')}</option>
              <option value="light">{t('light_mode')}</option>
              <option value="dark">{t('dark_mode')}</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{t('week_starts_on')}</label>
            <select value={settings.weekStartsOn} onChange={e => setSettings({...settings, weekStartsOn: parseInt(e.target.value)})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}>
              <option value={0}>{t('sunday')}</option>
              <option value={1}>{t('monday')}</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}>{t('cancel')}</button>
          <button onClick={handleSave} disabled={isSaving} style={{ padding: '8px 16px', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '4px', cursor: isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
            {isSaving ? t('loading') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
};