import { useState, useEffect, useRef } from 'react';
import type { AppData } from '../types';
import { compressData, decompressData } from '../utils/compression';
import { mergeAppData } from '../utils/merge';

const STORAGE_KEY = 'progress_app_v2';
const DEFAULT_START = 1577836800000; // 2020-01-01

export const useAppData = () => {
  const [data, setData] = useState<AppData | null>(null);
  const isLoaded = useRef(false);

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
          const merged = mergeAppData(localData, incoming);
          setData(merged);
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      }
      setData(localData);
    };
    load();
  }, []);

  useEffect(() => {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  const getShareUrl = () => {
    if (!data) return '';
    const compressed = compressData(data);
    return `${window.location.origin}${window.location.pathname}?d=${compressed}`;
  };

  return { data, setData, getShareUrl };
};