import { useState, useEffect, useRef } from 'react';
import type { AppData, Task } from '../types';
import { compressData, decompressData } from '../utils/compression';
import { useHistory } from './useHistory';

const STORAGE_KEY = 'progress_app_v2';

// ID生成
const generateProjectId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

// デフォルトプロジェクト作成
const createDefaultProject = (): AppData => ({
  id: generateProjectId(),
  projectName: 'マイプロジェクト',
  tasks: [],
  lastSynced: Date.now()
});

// 比較関数
const isTaskEqual = (local: Task, incoming: Task): boolean => {
  if (local.id !== incoming.id) return false;
  if (local.name !== incoming.name) return false;
  if (local.status !== incoming.status) return false;
  if (local.parentId !== incoming.parentId) return false;
  
  // 期限の比較 (undefined同士、または値の一致)
  if (local.deadline !== incoming.deadline) return false;

  if (local.isDeleted !== incoming.isDeleted) return false;
  if ((local.order ?? 0) !== (incoming.order ?? 0)) return false;

  // 更新日時の比較 (分単位に切り捨てて比較)
  const localMin = Math.floor(local.lastUpdated / 60000);
  const incomingMin = Math.floor(incoming.lastUpdated / 60000);
  
  return localMin === incomingMin;
};

export const useAppData = () => {
  // 変更: useHistoryを使用
  const { 
    state: projects, 
    setState: setProjects, 
    resetState: resetProjects, 
    undo, 
    redo 
  } = useHistory<AppData[]>([]);

  const [activeId, setActiveId] = useState<string>('');
  
  const activeData = projects.find(p => p.id === activeId) || null;
  const [incomingData, setIncomingData] = useState<AppData | null>(null);
  const isLoaded = useRef(false);

  // 1. 初期ロード処理
  useEffect(() => {
    if (isLoaded.current) return;
    isLoaded.current = true;

    const load = () => {
      const localJson = localStorage.getItem(STORAGE_KEY);
      let loadedProjects: AppData[] = [];
      let initialActiveId = '';

      if (localJson) {
        try {
          const parsed = JSON.parse(localJson);
          if (Array.isArray(parsed)) {
            loadedProjects = parsed;
          } else {
            // マイグレーション対応
            const migrated = { ...parsed, id: parsed.id || generateProjectId() };
            loadedProjects = [migrated];
          }
        } catch (e) {
          console.error("Failed to parse local storage", e);
        }
      }

      if (loadedProjects.length === 0) {
        const def = createDefaultProject();
        loadedProjects = [def];
      }

      initialActiveId = loadedProjects[0].id;
      
      const params = new URLSearchParams(window.location.search);
      const compressed = params.get('d');
      
      let newIncoming: AppData | null = null;
      let shouldAutoApply = false;
      let isIdenticalToExisting = false; 

      if (compressed) {
        const incoming = decompressData(compressed);
        if (incoming) {
          incoming.id = generateProjectId();
          newIncoming = incoming;
          
          const sameNameProject = loadedProjects.find(p => p.projectName === incoming.projectName);

          if (sameNameProject) {
            initialActiveId = sameNameProject.id;
            
            const localActive = sameNameProject.tasks.filter(t => !t.isDeleted);
            const incomingActive = incoming.tasks.filter(t => !t.isDeleted);

            if (localActive.length === incomingActive.length) {
                const allMatch = localActive.every((localTask, index) => {
                    const incomingTask = incomingActive[index];
                    return isTaskEqual(localTask, incomingTask);
                });

                if (allMatch) {
                    isIdenticalToExisting = true;
                }
            }

          } else {
            const currentTarget = loadedProjects.find(p => p.id === initialActiveId);
            const hasActiveTasks = currentTarget && currentTarget.tasks.some(t => !t.isDeleted);

            if (!hasActiveTasks) {
              shouldAutoApply = true;
            } 
          }
        }
      }

      if (shouldAutoApply && newIncoming) {
        loadedProjects = loadedProjects.map(p => 
            p.id === initialActiveId ? newIncoming! : p
        );
        initialActiveId = newIncoming.id;
        window.history.replaceState(null, '', window.location.pathname);
      } else if (newIncoming && !isIdenticalToExisting) {
        setIncomingData(newIncoming);
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        window.history.replaceState(null, '', window.location.pathname);
      }

      // 変更: 初期ロード時は履歴に残さない resetProjects を使用
      resetProjects(loadedProjects);
      setActiveId(initialActiveId);
    };
    load();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }
  }, [projects]);

  useEffect(() => {
    if (activeData) {
      const compressed = compressData(activeData);
      const newUrl = `${window.location.origin}${window.location.pathname}?d=${compressed}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [activeData]);

  const setActiveData = (newData: AppData) => {
    // 変更: setProjects (履歴機能付き) を使用
    setProjects(prev => prev.map(p => p.id === newData.id ? newData : p));
  };

  const addProject = () => {
    const newProject = createDefaultProject();
    let nameCandidate = 'マイプロジェクト';
    let counter = 1;
    const existingNames = new Set(projects.map(p => p.projectName));
    while (existingNames.has(nameCandidate)) {
      counter++;
      nameCandidate = `マイプロジェクト ${counter}`;
    }
    newProject.projectName = nameCandidate;
    setProjects(prev => [...prev, newProject]);
    setActiveId(newProject.id);
  };

  const importNewProject = (data: AppData) => {
    let name = data.projectName;
    let suffix = 1;
    while(projects.some(p => p.projectName === name)) {
       name = `${data.projectName} (${suffix++})`;
    }
    const newProject = { ...data, id: generateProjectId(), projectName: name };
    setProjects(prev => [...prev, newProject]);
    setActiveId(newProject.id);
    setIncomingData(null);
  };

  const switchProject = (id: string) => {
    if (projects.some(p => p.id === id)) {
      setActiveId(id);
    }
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) {
      alert("最後のプロジェクトは削除できません。");
      return;
    }
    if (!confirm("このプロジェクトを削除しますか？")) return;
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    if (id === activeId) {
      setActiveId(newProjects[0].id);
    }
  };

  const getShareUrl = () => {
    if (!activeData) return '';
    const compressed = compressData(activeData);
    return `${window.location.origin}${window.location.pathname}?d=${compressed}`;
  };

  return { 
    data: activeData, 
    setData: setActiveData, 
    incomingData, 
    setIncomingData, 
    getShareUrl,
    projects,
    activeId,
    addProject,
    importNewProject,
    switchProject,
    deleteProject,
    undo, // 公開
    redo  // 公開
  };
};