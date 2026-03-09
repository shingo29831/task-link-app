// src/components/UserSettingsModal.tsx
// 役割: ユーザー設定（言語、テーマ、タイムゾーン、レイアウト等）とアカウント設定への遷移を管理するモーダル
// なぜ: 言語設定変更時に即座にUIへ反映させつつ、保存は確定時のみ行うため（キャンセル時は元に戻す）

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { useUserSettings } from '../hooks/useUserSettings';
import { IconX } from './Icons';

interface UserSettingsModalProps {
  onClose: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useUserSettings();
  const { isSignedIn } = useAuth();
  const { openUserProfile } = useClerk();

  const [language, setLanguage] = useState(settings.language || 'ja');
  const [theme, setTheme] = useState(settings.theme || 'system');
  const [timezone, setTimezone] = useState(settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo');
  const [customBoardLayout, setCustomBoardLayout] = useState(!!settings.customBoardLayout);
  const [boardLayoutDesktop, setBoardLayoutDesktop] = useState(settings.boardLayoutDesktop || 'horizontal');
  const [boardLayoutTablet, setBoardLayoutTablet] = useState(settings.boardLayoutTablet || 'horizontal');
  const [boardLayoutMobile, setBoardLayoutMobile] = useState(settings.boardLayoutMobile || 'vertical');

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    i18n.changeLanguage(newLang); // 即時適用（プレビュー用）
  };

  const handleCancel = () => {
    // 保存せずにキャンセルした場合は元の言語に戻す
    const originalLang = settings.language || 'ja';
    if (language !== originalLang) {
      i18n.changeLanguage(originalLang);
    }
    onClose();
  };

  const handleSave = async () => {
    await updateSettings({
      ...settings,
      language,
      theme,
      timezone,
      customBoardLayout,
      boardLayoutDesktop,
      boardLayoutTablet,
      boardLayoutMobile,
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={handleCancel}>
      <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '450px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', color: 'var(--text-primary)', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2em' }}>{t('settings') || '設定'}</h2>
          <button onClick={handleCancel} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}><IconX size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', fontWeight: 'bold' }}>{t('language') || '言語'}</label>
            <select value={language} onChange={handleLanguageChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', fontWeight: 'bold' }}>{t('theme') || 'テーマ'}</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
              <option value="system">{t('system_default') || 'システム設定に従う'}</option>
              <option value="light">{t('light_mode') || 'ライト'}</option>
              <option value="dark">{t('dark_mode') || 'ダーク'}</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', fontWeight: 'bold' }}>{t('timezone') || 'タイムゾーン'}</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
              <option value="Asia/Tokyo">{t('tz_asia_tokyo') || 'Asia/Tokyo (日本標準時)'}</option>
              <option value="UTC">{t('tz_utc') || 'UTC (協定世界時)'}</option>
              <option value="America/New_York">{t('tz_america_new_york') || 'America/New_York (東部標準時)'}</option>
              <option value="America/Los_Angeles">{t('tz_america_los_angeles') || 'America/Los_Angeles (太平洋標準時)'}</option>
              <option value="Europe/London">{t('tz_europe_london') || 'Europe/London (グリニッジ標準時)'}</option>
              <option value="Europe/Paris">{t('tz_europe_paris') || 'Europe/Paris (中央ヨーロッパ標準時)'}</option>
              <option value="Asia/Shanghai">{t('tz_asia_shanghai') || 'Asia/Shanghai (中国標準時)'}</option>
              <option value="Australia/Sydney">{t('tz_australia_sydney') || 'Australia/Sydney (オーストラリア東部標準時)'}</option>
            </select>
          </div>

          <div style={{ paddingTop: '8px' }}>
             <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em', fontWeight: 'bold', cursor: 'pointer' }}>
               <input type="checkbox" checked={customBoardLayout} onChange={(e) => setCustomBoardLayout(e.target.checked)} />
               {t('enable_custom_layout') || 'デバイスごとのレイアウト設定を有効にする'}
             </label>
          </div>

          {customBoardLayout && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '24px' }}>
                <div>
                   <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85em', color: 'var(--text-secondary)' }}>Desktop (&gt; 1024px)</label>
                   <select value={boardLayoutDesktop} onChange={(e) => setBoardLayoutDesktop(e.target.value as 'horizontal' | 'vertical')} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                     <option value="horizontal">{t('layout_horizontal') || '横並び'}</option>
                     <option value="vertical">{t('layout_vertical') || '縦並び'}</option>
                   </select>
                </div>
                <div>
                   <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85em', color: 'var(--text-secondary)' }}>Tablet (481px - 1024px)</label>
                   <select value={boardLayoutTablet} onChange={(e) => setBoardLayoutTablet(e.target.value as 'horizontal' | 'vertical')} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                     <option value="horizontal">{t('layout_horizontal') || '横並び'}</option>
                     <option value="vertical">{t('layout_vertical') || '縦並び'}</option>
                   </select>
                </div>
                <div>
                   <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85em', color: 'var(--text-secondary)' }}>Mobile (&lt;= 480px)</label>
                   <select value={boardLayoutMobile} onChange={(e) => setBoardLayoutMobile(e.target.value as 'horizontal' | 'vertical')} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                     <option value="horizontal">{t('layout_horizontal') || '横並び'}</option>
                     <option value="vertical">{t('layout_vertical') || '縦並び'}</option>
                   </select>
                </div>
             </div>
          )}

          {isSignedIn && (
             <div style={{ marginTop: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
               <button onClick={() => { openUserProfile(); handleCancel(); }} style={{ padding: '10px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  {t('account_settings') || 'アカウント設定'}
               </button>
             </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
          <button onClick={handleCancel} style={{ padding: '8px 16px', background: 'var(--bg-button)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>{t('cancel') || 'キャンセル'}</button>
          <button onClick={handleSave} style={{ padding: '8px 16px', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>{t('save') || '保存'}</button>
        </div>
      </div>
    </div>
  );
};