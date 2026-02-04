import { useState, useEffect, useRef } from 'react';
import type { AppData } from '../types';
import { compressData, decompressData } from '../utils/compression';
import { mergeAppData } from '../utils/merge';

const STORAGE_KEY = 'progress_app_v1';

export const useAppData = () => {
  const [data, setData] = useState<AppData | null>(null);
  const isLoaded = useRef(false); // ロード済みかどうかのフラグ

  // 初期化：LocalStorage読み込み & URLパラメータのマージ
  useEffect(() => {
    // すでにロード済みなら何もしない（StrictMode対策）
    if (isLoaded.current) return;
    isLoaded.current = true;

    const load = () => {
      // 1. ローカル読み込み
      const localJson = localStorage.getItem(STORAGE_KEY);
      const localData: AppData = localJson 
        ? JSON.parse(localJson) 
        : { projectStartDate: Date.now(), tasks: [], lastSynced: 0 };

      // 2. URLパラメータ確認
      const params = new URLSearchParams(window.location.search);
      const compressed = params.get('d');
      
      if (compressed) {
        const incoming = decompressData(compressed);
        if (incoming) {
          const merged = mergeAppData(localData, incoming);
          setData(merged);
          // URLをクリーンにする
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      }
      setData(localData);
    };
    load();
  }, []);

  // データ変更時に保存
  useEffect(() => {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  // UIに公開する関数：共有URL取得
  const getShareUrl = () => {
    if (!data) return '';
    const compressed = compressData(data);
    return `${window.location.origin}/?d=${compressed}`;
  };

  return { data, setData, getShareUrl };
};