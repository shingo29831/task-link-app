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
      lastUpdated: 0
    };
  });

  const isLoaded = useRef(false);

  // ローカルDBの設定を初回のみ即座に適用
  useEffect(() => {
    if (isLoaded.current) return;
    const localData = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (localData) {
      try {
        const parsed = JSON.parse(localData) as UserSettings;
        if (parsed.language && parsed.language !== i18n.language) {
          i18n.changeLanguage(parsed.language);
        }
      } catch (e) {
        console.error(e);
      }
    }
    isLoaded.current = true;
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
               if (newSettings.language && newSettings.language !== i18n.language) {
                 i18n.changeLanguage(newSettings.language);
               }
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
  }, [isSignedIn, getToken, i18n]);

  const updateSettings = async (newSettings: Omit<UserSettings, 'lastUpdated'>) => {
    const updatedSettings: UserSettings = { ...newSettings, lastUpdated: Date.now() };
    setSettings(updatedSettings);
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updatedSettings));
    if (updatedSettings.language && updatedSettings.language !== i18n.language) {
      i18n.changeLanguage(updatedSettings.language);
    }

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