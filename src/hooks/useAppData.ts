import { useState, useEffect, useRef } from 'react';
import type { AppData } from '../types';
import { compressData, decompressData } from '../utils/compression';

const STORAGE_KEY = 'progress_app_v2';
const DEFAULT_START = 1577836800000; // 2020-01-01

export const useAppData = () => {
  const [data, setData] = useState<AppData | null>(null);
  const [incomingData, setIncomingData] = useState<AppData | null>(null);
  const isLoaded = useRef(false);

  // 1. 初期ロード処理
  useEffect(() => {
    if (isLoaded.current) return;
    isLoaded.current = true;

    const load = () => {
      const localJson = localStorage.getItem(STORAGE_KEY);
      const localData: AppData = localJson 
      ? JSON.parse(localJson) 
      : { 
          projectName: 'マイプロジェクト', // デフォルト名
          projectStartDate: DEFAULT_START, 
          tasks: [], 
          lastSynced: 0 
        };

      const params = new URLSearchParams(window.location.search);
      const compressed = params.get('d');
      
      if (compressed) {
        const incoming = decompressData(compressed);
        if (incoming) {
          // ローカルに有効なタスク（未削除）があるか確認
          const hasActiveTasks = localData.tasks.some(t => !t.isDeleted);

          if (!hasActiveTasks) {
            // 有効なタスクが無い場合（初回や全削除時）は、確認なしで自動適用
            setData(incoming);
          } else {
            // 有効なタスクがある場合は、マージ候補としてセット（モーダルを表示）
            setIncomingData(incoming);
            setData(localData);
          }
          
          // 読み込み後はURLパラメータを一旦クリア
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      }
      setData(localData);
    };
    load();
  }, []);

  // 2. データの変更をURLとLocalStorageにリアルタイム同期
  useEffect(() => {
    if (data) {
      // LocalStorageへの保存
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      // アドレスバーのURLを最新の状態に更新
      const compressed = compressData(data);
      const newUrl = `${window.location.origin}${window.location.pathname}?d=${compressed}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [data]);

  const getShareUrl = () => {
    if (!data) return '';
    const compressed = compressData(data);
    return `${window.location.origin}${window.location.pathname}?d=${compressed}`;
  };

  return { data, setData, incomingData, setIncomingData, getShareUrl };
};