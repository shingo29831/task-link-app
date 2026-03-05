// 役割: アプリケーション全体のデータ管理（ローカル状態、クラウド同期、ストレージ永続化）の統合Facade

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useProjectState } from './useProjectState';
import { useCloudSync } from './useCloudSync';
import { compressData, decompressData } from '../utils/compression';
import tutorialData from '../data/tutorial.json';
import { calculateHashAsync, generateProjectId, isEffectivelyIdentical, isUUID, createDefaultProject } from '../utils/projectUtils';
import type { AppData } from '../types';

const STORAGE_KEY = 'progress_app_v2';

export const useAppData = () => {
  const { getToken } = useAuth();

  // 1. ローカル状態の管理
  const projectState = useProjectState();
  const { projects, setProjects, resetProjects, projectsRef, activeId, setActiveId, activeData, setIncomingData } = projectState;

  const lastSyncedHashMap = useRef<Record<string, number>>({});
  const isLoaded = useRef(false);
  const initialUrlGuardRef = useRef(true);
  
  // URL に ?d= パラメータを省略する（クリーンURL）モードかどうかを保持
  const omitDataParamRef = useRef(!new URLSearchParams(window.location.search).has('d'));

  // 2. クラウド同期ロジックの統合
  const cloudSync = useCloudSync(activeData, activeId, projectsRef, setProjects, setActiveId, lastSyncedHashMap);

  // 3. Storageからの初期ロードと URL パラメータの処理
  useEffect(() => {
    if (isLoaded.current) return;
    isLoaded.current = true;

    const load = async () => {
      const localJson = localStorage.getItem(STORAGE_KEY);
      let loadedProjects: AppData[] = [];
      let initialActiveId = '';

      if (localJson) {
        try {
          const parsed = JSON.parse(localJson);
          if (Array.isArray(parsed)) {
            loadedProjects = parsed.map((p: any) => ({ ...p, id: (isUUID(p.id) || String(p.id).startsWith('local_')) ? p.id : generateProjectId() }));
          } else {
            loadedProjects = [{ ...parsed, id: generateProjectId() }];
          }
        } catch (e) { console.error("Failed to parse local storage", e); }
      }

      const now = Date.now();
      const tutorialProject: AppData = {
        id: tutorialData.id, projectName: tutorialData.projectName,
        tasks: tutorialData.tasks.map((t: any) => ({ ...t, lastUpdated: now })) as any,
        lastSynced: now, isCloudSync: false, role: 'owner'
      };

      const existingTutorialIdx = loadedProjects.findIndex(p => p.id === tutorialProject.id);
      if (existingTutorialIdx >= 0) loadedProjects[existingTutorialIdx] = tutorialProject;
      else loadedProjects.unshift(tutorialProject);

      if (loadedProjects.length === 1 && loadedProjects[0].id === tutorialProject.id) {
         loadedProjects.push(createDefaultProject());
      }

      initialActiveId = loadedProjects[0].id;
      
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const isSharedLink = pathParts.length === 1;

      if (!isSharedLink) {
        const params = new URLSearchParams(window.location.search);
        const compressed = params.get('d');
        if (compressed) {
          const incoming = decompressData(compressed);
          if (incoming) {
            const isIdentical = loadedProjects.some(p => isEffectivelyIdentical(p, incoming));
            if (!isIdentical) {
              incoming.id = generateProjectId();
              setIncomingData(incoming);
            }
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }

      for (const p of loadedProjects) { lastSyncedHashMap.current[p.id] = await calculateHashAsync(p); }
      
      resetProjects(loadedProjects);
      setActiveId(initialActiveId);
    };
    load();
  }, [resetProjects, setIncomingData, setActiveId]);

  // 4. StorageとURLへの永続化 (副作用)
  useEffect(() => {
    if (projects.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (activeData) {
      if (initialUrlGuardRef.current) {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        if (pathParts.length === 1 && activeData.shortId === pathParts[0]) {
            initialUrlGuardRef.current = false;
        } else if (pathParts.length !== 1) {
            initialUrlGuardRef.current = false;
        }
      }

      const isLocal = String(activeData.id).startsWith('local_') || activeData.isCloudSync === false;
      const basePath = isLocal || !activeData.shortId ? '/' : `/${activeData.shortId}/`;
      
      // ?d=なしでアクセスした場合、クラウドプロジェクト表示中はdパラメータを付与しない
      if (!isLocal && omitDataParamRef.current) {
        window.history.replaceState(null, '', `${window.location.origin}${basePath}`);
      } else {
        const compressed = compressData(activeData);
        window.history.replaceState(null, '', `${window.location.origin}${basePath}?d=${compressed}`);
      }
    }
  }, [activeData]);

  const deleteProject = useCallback(async (id: string, deleteFromCloud: boolean = true) => {
    if (projectsRef.current.length <= 1) { alert("最後のプロジェクトは削除できません。"); return; }
    
    const targetProject = projectsRef.current.find((p: AppData) => p.id === id);
    if (deleteFromCloud && targetProject && !String(targetProject.id).startsWith('local_') && targetProject.isCloudSync !== false) {
       try {
          const token = await getToken();
          await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
       } catch (e) { console.error("Failed to delete from cloud", e); }
    }

    const newProjects = projectsRef.current.filter((p: AppData) => p.id !== id);
    setProjects(newProjects);
    if (id === activeId) setActiveId(newProjects[0].id);
  }, [projectsRef, getToken, setProjects, activeId, setActiveId]);

  // 引数 withData で URL の出力形式を分ける
  const getShareUrl = useCallback((withData: boolean = true) => {
    if (!activeData) return '';
    const isLocal = String(activeData.id).startsWith('local_') || activeData.isCloudSync === false;
    const basePath = isLocal || !activeData.shortId ? '/' : `/${activeData.shortId}/`;
    
    if (!withData && !isLocal && activeData.shortId) {
      return `${window.location.origin}${basePath}`;
    }
    
    const compressed = compressData(activeData);
    return `${window.location.origin}${basePath}?d=${compressed}`;
  }, [activeData]);

  return {
    ...projectState,
    ...cloudSync,
    deleteProject,
    getShareUrl,
    data: activeData
  };
};