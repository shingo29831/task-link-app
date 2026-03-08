// src/hooks/useAppData.ts
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

  // 2. クラウド同期ロジックの統合
  const cloudSync = useCloudSync(activeData, activeId, projectsRef, setProjects, setActiveId, lastSyncedHashMap);

  // 3. Storageからの初期ロードと URL パラメータの処理
  useEffect(() => {
    if (isLoaded.current) return;
    isLoaded.current = true;

    const load = async () => {
      const localJson = localStorage.getItem(STORAGE_KEY);
      let loadedProjects: AppData[] = [];

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

      let initialActiveId = loadedProjects[0].id;
      
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const isSharedLink = pathParts.length === 1 || (pathParts.length === 2 && pathParts[1] === 'snapshot');

      if (isSharedLink) {
        const shortId = pathParts[0];
        const existingProj = loadedProjects.find(p => p.shortId === shortId);
        if (existingProj) {
          const params = new URLSearchParams(window.location.search);
          if (params.has('d')) {
             existingProj.includeDataInLink = true; // なぜ: URLに?d=がある場合は消えないように有効化しておく
          }
          initialActiveId = existingProj.id;
        }
      } else {
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
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const isSharedOrSnapshot = pathParts.length === 1 || (pathParts.length === 2 && pathParts[1] === 'snapshot');

      if (initialUrlGuardRef.current) {
        if (isSharedOrSnapshot) {
          if (activeData.shortId === pathParts[0]) {
            const params = new URLSearchParams(window.location.search);
            // なぜ: APIで検証が終わる前にURLの?d=を消してしまわないようにガードを維持する
            if (params.has('d') && !activeData.includeDataInLink) {
               return; 
            }
            initialUrlGuardRef.current = false;
          } else {
            return;
          }
        } else {
          initialUrlGuardRef.current = false;
        }
      }

      const isLocal = String(activeData.id).startsWith('local_') || (!activeData.shortId && activeData.isCloudSync === false);
      const isSnapshot = !!activeData.isSnapshot;
      const includeData = isLocal || !!(activeData as any).includeDataInLink;
      
      let basePath = '/';
      if (!isLocal && activeData.shortId) {
          basePath = isSnapshot ? `/${activeData.shortId}/snapshot/` : `/${activeData.shortId}/`;
      }
      
      if (!includeData) {
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

  const getShareUrl = useCallback(() => {
    if (!activeData) return '';
    const isLocal = String(activeData.id).startsWith('local_') || (!activeData.shortId && activeData.isCloudSync === false);
    const includeData = isLocal || !!(activeData as any).includeDataInLink;
    const isSnapshot = !!activeData.isSnapshot;
    
    let basePath = '/';
    if (!isLocal && activeData.shortId) {
        basePath = isSnapshot ? `/${activeData.shortId}/snapshot/` : `/${activeData.shortId}/`;
    }
    
    if (!includeData && activeData.shortId) {
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