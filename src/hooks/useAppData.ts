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
  
  if (local.deadline !== incoming.deadline) return false;

  if (local.isDeleted !== incoming.isDeleted) return false;
  if ((local.order ?? 0) !== (incoming.order ?? 0)) return false;

  const localMin = Math.floor(local.lastUpdated / 60000);
  const incomingMin = Math.floor(incoming.lastUpdated / 60000);
  
  return localMin === incomingMin;
};

export const useAppData = () => {
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
          // まず仮のIDを振るが、後で上書き対象のIDに置き換える可能性がある
          incoming.id = generateProjectId();
          
          const sameNameProject = loadedProjects.find(p => p.projectName === incoming.projectName);

          if (sameNameProject) {
            initialActiveId = sameNameProject.id;
            
            // ▼ 修正: 同名プロジェクトが存在しても、タスクが空なら自動適用対象にする
            const isSameNameEmpty = sameNameProject.tasks.every(t => t.isDeleted);
            
            if (isSameNameEmpty) {
                // 同名の空プロジェクトを上書きターゲットにする
                incoming.id = sameNameProject.id;
                newIncoming = incoming;
                shouldAutoApply = true;
            } else {
                // 空でないなら通常のマージ判定
                newIncoming = incoming; // 新規IDのまま
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
            }
          } else {
            // 同名がない場合、現在の初期プロジェクトが空なら上書き
            const currentTarget = loadedProjects.find(p => p.id === initialActiveId);
            const hasActiveTasks = currentTarget && currentTarget.tasks.some(t => !t.isDeleted);

            if (!hasActiveTasks && currentTarget) {
              incoming.id = currentTarget.id;
              newIncoming = incoming;
              shouldAutoApply = true;
            } else {
              newIncoming = incoming;
            }
          }
        }
      }

      if (shouldAutoApply && newIncoming) {
        // 自動適用: ターゲットIDのプロジェクトを差し替える
        loadedProjects = loadedProjects.map(p => 
            p.id === newIncoming!.id ? newIncoming! : p
        );
        initialActiveId = newIncoming.id;
        window.history.replaceState(null, '', window.location.pathname);
        alert(`プロジェクト名：${newIncoming.projectName} を読み込みました。`);

      } else if (newIncoming && !isIdenticalToExisting) {
        setIncomingData(newIncoming);
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        window.history.replaceState(null, '', window.location.pathname);
      }

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
    undo,
    redo
  };
};