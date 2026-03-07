// src/hooks/useUserSettings.ts
// 役割: ユーザー設定（言語、テーマ等）のローカルDBとクラウド同期を管理
// なぜ: ログイン前後の設定の一貫性を保ち、端末間で最新の設定を共有するため

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import type { UserSettings } from '../types';

const LOCAL_SETTINGS_KEY = 'user_settings_v1';

export const useUserSettings = () => {
  const { getToken, isSignedIn } = useAuth();
  const { i18n } = useTranslation();
  
  const [settings, setSettings] = useState<UserSettings>(() => {
    const localData = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (localData) {
      try {
        return JSON.parse(localData) as UserSettings;
      } catch (e) {
        console.error("Failed to parse local user settings", e);
      }
    }
    return {
      language: i18n.language || 'ja',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo',
      theme: 'system',
      weekStartsOn: 0,
      boardLayout: 'horizontal',
      customBoardLayout: false,
      boardLayoutDesktop: 'horizontal',
      boardLayoutTablet: 'horizontal',
      boardLayoutMobile: 'vertical',
      lastUpdated: 0
    };
  });

  const isLoaded = useRef(false);

  // カスタムイベントをリッスンし、設定変更を全コンポーネントに即時反映
  useEffect(() => {
    const handleStorageChange = () => {
      const localData = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (localData) {
        try {
          const parsed = JSON.parse(localData) as UserSettings;
          setSettings(parsed);
          if (parsed.language && parsed.language !== i18n.language) {
            i18n.changeLanguage(parsed.language);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    window.addEventListener('user-settings-updated', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    if (!isLoaded.current) {
      handleStorageChange();
      isLoaded.current = true;
    }

    return () => {
      window.removeEventListener('user-settings-updated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [i18n]);

  // クラウドからの読み込みとマージ（クラウドが最新なら上書き）
  useEffect(() => {
    if (!isSignedIn) return;

    const fetchCloudSettings = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch('/api/user/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const cloudSettings = await res.json() as UserSettings;
          
          setSettings(prev => {
            const localUpdated = prev.lastUpdated || 0;
            const cloudUpdated = cloudSettings.lastUpdated || 0;
            
            if (cloudUpdated >= localUpdated) {
               const newSettings = { ...prev, ...cloudSettings };
               localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(newSettings));
               window.dispatchEvent(new Event('user-settings-updated'));
               return newSettings;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Failed to fetch cloud settings", error);
      }
    };

    fetchCloudSettings();
  }, [isSignedIn, getToken]);

  const updateSettings = async (newSettings: Omit<UserSettings, 'lastUpdated'>) => {
    const updatedSettings: UserSettings = { ...newSettings, lastUpdated: Date.now() };
    setSettings(updatedSettings);
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updatedSettings));
    
    // イベントを発火して他のフックインスタンスにも反映
    window.dispatchEvent(new Event('user-settings-updated'));

    if (isSignedIn) {
      try {
        const token = await getToken();
        await fetch('/api/user/settings', {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedSettings)
        });
      } catch (error) {
        console.error("Failed to save settings to cloud", error);
        throw error;
      }
    }
  };

  return { settings, updateSettings };
};