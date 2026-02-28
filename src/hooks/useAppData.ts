import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { AppData, Task } from '../types';
import { compressData, decompressData } from '../utils/compression';
import { useHistory } from './useHistory';

const STORAGE_KEY = 'progress_app_v2';

const generateProjectId = () => 'local_' + crypto.randomUUID();

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const createDefaultProject = (): AppData => ({
  id: generateProjectId(),
  projectName: 'マイプロジェクト',
  tasks: [],
  lastSynced: Date.now(),
  isCloudSync: false,
  role: 'owner'
});

const calculateHash = (project: AppData): number => {
  const essentialTasks = project.tasks.map(t => ({
    id: t.id,
    name: t.name,
    status: t.status,
    parentId: t.parentId,
    deadline: t.deadline,
    isDeleted: t.isDeleted,
    order: t.order
  }));
  const str = project.projectName + JSON.stringify(essentialTasks);
  
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0;
};

export const useAppData = () => {
  const { getToken, isSignedIn } = useAuth();

  const { state: projects, setState: setProjects, resetState: resetProjects, undo, redo, canUndo, canRedo } = useHistory<AppData[]>([]);

  const [activeId, setActiveId] = useState<string>('');
  const activeData = projects.find(p => p.id === activeId) || null;
  const [incomingData, setIncomingData] = useState<AppData | null>(null);
  const isLoaded = useRef(false);
  
  const lastSyncedHashMap = useRef<Record<string, number>>({});

  const [currentLimit, setCurrentLimit] = useState<number>(3);
  const [syncLimitState, setSyncLimitState] = useState<{ isOverLimit: boolean, limit: number, cloudProjects: any[] } | null>(null);
  
  const [syncState, setSyncState] = useState<'idle' | 'waiting' | 'syncing' | 'synced'>('idle');

  const initialUrlGuardRef = useRef(true);

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
            loadedProjects = parsed.map(p => ({
              ...p,
              id: (isUUID(p.id) || String(p.id).startsWith('local_')) ? p.id : generateProjectId()
            }));
          } else {
            const migrated = { ...parsed, id: generateProjectId() };
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
      
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const isSharedLink = pathParts.length === 1;

      if (!isSharedLink) {
        const params = new URLSearchParams(window.location.search);
        const compressed = params.get('d');

        if (compressed) {
          const incoming = decompressData(compressed);
          if (incoming) {
            incoming.id = generateProjectId();
            setIncomingData(incoming);
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }

      loadedProjects.forEach(p => {
        lastSyncedHashMap.current[p.id] = calculateHash(p);
      });

      resetProjects(loadedProjects);
      setActiveId(initialActiveId);
    };
    load();
  }, []);

  const applyCloudProjects = useCallback((dbProjects: any[]) => {
    const loadedCloud = dbProjects.map((row: any) => {
      const p = {
        id: row.id,
        shortId: row.shortId,
        projectName: row.projectName,
        tasks: row.data.tasks || [],
        lastSynced: row.data.lastSynced || Date.now(),
        isCloudSync: true,
        role: row.role || 'owner',
      };
      lastSyncedHashMap.current[p.id] = calculateHash(p);
      return p;
    });

    setProjects(prev => {
      const newProjects = [...prev];
      loadedCloud.forEach(cp => {
        const existingIdx = newProjects.findIndex(p => p.id === cp.id);
        if (existingIdx >= 0) newProjects[existingIdx] = cp;
        else newProjects.push(cp);
      });
      return newProjects;
    });
    
    return loadedCloud;
  }, [setProjects]);

  useEffect(() => {
    if (!isSignedIn) return;

    const loadFromCloud = async () => {
      try {
        const token = await getToken();
        const res = await fetch('http://localhost:5174/api/projects', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const { projects: dbProjects, limit } = await res.json();
          setCurrentLimit(limit);

          if (dbProjects.length > limit) {
            setSyncLimitState({ isOverLimit: true, limit, cloudProjects: dbProjects });
            return;
          }
          const loadedCloud = applyCloudProjects(dbProjects);
          setSyncState('synced');
          
          if (loadedCloud.length > 0 && !loadedCloud.find(p => p.id === activeId)) {
            setActiveId(loadedCloud[0].id);
          }
        }
      } catch (e) {
        console.error('クラウドからのデータ読み込みに失敗しました', e);
      }
    };

    loadFromCloud();
  }, [isSignedIn, getToken, applyCloudProjects, activeId]);

  const resolveSyncLimit = async (selectedCloudIds: string[]) => {
    if (!syncLimitState) return;
    const token = await getToken();
    const unselected = syncLimitState.cloudProjects.filter(p => !selectedCloudIds.includes(p.id));
    
    for (const p of unselected) {
       try {
         await fetch(`http://localhost:5174/api/projects/${p.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
       } catch (e) { console.error(e) }
    }

    applyCloudProjects(syncLimitState.cloudProjects.filter(p => selectedCloudIds.includes(p.id)));
    
    const downgradedLocal = unselected.map((row: any) => ({
      id: generateProjectId(),
      projectName: row.projectName + ' (オフライン)',
      tasks: row.data.tasks || [],
      lastSynced: Date.now(),
      isCloudSync: false,
      role: 'owner'
    }));
    setProjects(prev => [...prev, ...downgradedLocal]);
    setSyncLimitState(null);
  };

  const uploadProject = async (localId: string) => {
    const target = projects.find(p => p.id === localId);
    if (!target) return;
    
    const cloudCount = projects.filter(p => !String(p.id).startsWith('local_') && p.isCloudSync !== false).length;
    if (cloudCount >= currentLimit) {
      alert(`プランのアップロード上限（${currentLimit}件）に達しています。\n不要なクラウドプロジェクトを削除するか、プランをアップグレードしてください。`);
      return;
    }

    try {
      setSyncState('syncing');
      const token = await getToken();
      const res = await fetch('http://localhost:5174/api/projects', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id, shortId: target.shortId, projectName: target.projectName, data: { tasks: target.tasks, lastSynced: target.lastSynced } })
      });

      if (res.ok) {
        const resData = await res.json();
        const finalId = resData.newId || target.id;
        const finalShortId = resData.shortId || target.shortId;
        lastSyncedHashMap.current[finalId] = calculateHash(target);
        
        setProjects(prev => prev.map(p => p.id === localId ? { ...p, id: finalId, shortId: finalShortId, isCloudSync: true, role: 'owner' } : p));
        if (activeId === localId && resData.newId) setActiveId(finalId);
        setSyncState('synced');
        alert('クラウドにアップロードしました！\n今後は自動的に同期されます。');
      } else {
        if (res.status === 403) {
          alert(`サーバーで制限が確認されました。アップロード上限（${currentLimit}件）に達しています。`);
        } else {
          alert('アップロードに失敗しました');
        }
        setSyncState('idle');
      }
    } catch (e) {
      console.error(e);
      setSyncState('idle');
      alert('アップロードに失敗しました');
    }
  };

  useEffect(() => {
    if (!isSignedIn || !activeData || String(activeData.id).startsWith('local_') || activeData.isCloudSync === false || activeData.role === 'viewer') {
      return;
    }

    const currentHash = calculateHash(activeData);

    if (lastSyncedHashMap.current[activeData.id] === currentHash) {
      setSyncState('synced');
      return;
    }

    setSyncState('waiting');

    const syncToCloud = async () => {
      setSyncState('syncing');
      try {
        const token = await getToken();
        
        const getRes = await fetch('http://localhost:5174/api/projects', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        let mergedTasks = [...activeData.tasks];
        let mergedProjectName = activeData.projectName;
        let requiresLocalUpdate = false;
        let isSameAsCloud = false;

        if (getRes.ok) {
          const { projects: dbProjects } = await getRes.json();
          const cloudProject = dbProjects.find((p: any) => p.id === activeData.id);
          
          if (cloudProject) {
            const cloudTasks = cloudProject.data.tasks || [];
            
            const taskMap = new Map<string, Task>();
            cloudTasks.forEach((t: Task) => taskMap.set(t.id, t));

            activeData.tasks.forEach((localTask) => {
              const cloudTask = taskMap.get(localTask.id);
              if (!cloudTask || localTask.lastUpdated > cloudTask.lastUpdated) {
                 taskMap.set(localTask.id, localTask);
              }
            });

            mergedTasks = Array.from(taskMap.values());
            
            if (JSON.stringify(mergedTasks) !== JSON.stringify(activeData.tasks)) {
                requiresLocalUpdate = true;
            }

            const cloudHash = calculateHash({ ...activeData, projectName: cloudProject.projectName, tasks: cloudTasks });
            const mergedHash = calculateHash({ ...activeData, projectName: mergedProjectName, tasks: mergedTasks });

            if (mergedHash === cloudHash) {
                isSameAsCloud = true;
            }
          }
        }

        const mergedProjectData = { ...activeData, projectName: mergedProjectName, tasks: mergedTasks };
        const newMergedHash = calculateHash(mergedProjectData);

        if (isSameAsCloud) {
          lastSyncedHashMap.current[activeData.id] = newMergedHash;
          if (requiresLocalUpdate) {
            setProjects(prev => prev.map(p => p.id === activeData.id ? { ...p, tasks: mergedTasks, projectName: mergedProjectName, lastSynced: Date.now() } : p));
          }
          setSyncState('synced');
          return;
        }

        const dataToUpload = { 
          id: activeData.id, 
          projectName: mergedProjectName, 
          data: { tasks: mergedTasks, lastSynced: Date.now() } 
        };

        const res = await fetch('http://localhost:5174/api/projects', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToUpload)
        });

        if (res.ok) {
          lastSyncedHashMap.current[activeData.id] = newMergedHash;

          if (requiresLocalUpdate) {
             setProjects(prev => prev.map(p => p.id === activeData.id ? { ...p, tasks: mergedTasks, projectName: mergedProjectName, lastSynced: Date.now() } : p));
          }
          
          setSyncState('synced');
        } else {
          setSyncState('idle');
        }
      } catch (e) { 
        console.error('クラウド同期エラー', e); 
        setSyncState('idle');
      }
    };

    const timeoutId = setTimeout(() => { syncToCloud(); }, 15000);
    return () => clearTimeout(timeoutId);
  }, [activeData, isSignedIn, getToken, setProjects]);

  useEffect(() => {
    if (projects.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (activeData) {
      if (initialUrlGuardRef.current) {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        if (pathParts.length === 1) {
           const urlShortId = pathParts[0];
           if (activeData.shortId !== urlShortId) {
              return; 
           } else {
              initialUrlGuardRef.current = false;
           }
        } else {
           initialUrlGuardRef.current = false;
        }
      }

      const compressed = compressData(activeData);
      const isLocal = String(activeData.id).startsWith('local_') || activeData.isCloudSync === false;
      const basePath = isLocal || !activeData.shortId ? '/' : `/${activeData.shortId}/`;
      window.history.replaceState(null, '', `${window.location.origin}${basePath}?d=${compressed}`);
    }
  }, [activeData]);

  const addOrUpdateProject = useCallback((newData: AppData) => {
    setProjects(prev => {
      const exists = prev.some(p => p.id === newData.id);
      if (exists) {
        return prev.map(p => p.id === newData.id ? newData : p);
      } else {
        return [...prev, newData];
      }
    });
    setActiveId(newData.id);
  }, [setProjects]);

  const setActiveData = (newData: AppData) => { setProjects(prev => prev.map(p => p.id === newData.id ? newData : p)); };
  const updateProject = useCallback((updatedProject: AppData) => { setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p)); }, [setProjects]);
  const replaceProject = useCallback((oldId: string, newData: AppData) => { setProjects(prev => prev.map(p => p.id === oldId ? newData : p)); }, [setProjects]);

  const addProject = () => {
    const newProject = createDefaultProject();
    let nameCandidate = 'マイプロジェクト', counter = 1;
    while (projects.some(p => p.projectName === nameCandidate)) nameCandidate = `マイプロジェクト ${++counter}`;
    newProject.projectName = nameCandidate;
    setProjects(prev => [...prev, newProject]);
    setActiveId(newProject.id);
  };

  const importNewProject = (data: AppData) => {
    let name = data.projectName, suffix = 1;
    while(projects.some(p => p.projectName === name)) name = `${data.projectName} (${suffix++})`;
    const newProject = { ...data, id: generateProjectId(), projectName: name };
    setProjects(prev => [...prev, newProject]);
    setActiveId(newProject.id);
    setIncomingData(null);
  };

  // ★ プロジェクト切り替え時にDBと照合して検証する
  const switchProject = async (id: string) => { 
    const targetProject = projects.find(p => p.id === id);
    if (!targetProject) return;

    if (String(id).startsWith('local_') || targetProject.isCloudSync === false) {
      setActiveId(id);
      return;
    }

    // App.tsx側にローディング表示を促すイベントを発行
    window.dispatchEvent(new CustomEvent('project-verifying', { detail: true }));

    try {
      let token: string | null = null;
      if (isSignedIn) {
        token = await getToken();
      }

      let hasAccess = false;
      let fetchedRole = targetProject.role;
      let targetTasks = targetProject.tasks;
      let isPublic = targetProject.isPublic;
      
      if (targetProject.shortId) {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`http://localhost:5174/api/projects/shared/${targetProject.shortId}`, { headers });
        const result = await response.json();
        
        if (response.ok && result.success) {
          hasAccess = true;
          fetchedRole = result.role;
          if (result.project && result.project.data && result.project.data.tasks) {
              targetTasks = result.project.data.tasks;
          } else if (result.project && result.project.tasks) {
              targetTasks = result.project.tasks;
          }
          if (result.project?.isPublic !== undefined) {
              isPublic = result.project.isPublic;
          }
        }
      } else if (token) {
        const response = await fetch(`http://localhost:5174/api/projects`, {
           headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
           const { projects: dbProjects } = await response.json();
           const found = dbProjects.find((p: any) => p.id === id);
           if (found) {
              hasAccess = true;
              fetchedRole = found.role || 'owner';
              if (found.data && found.data.tasks) {
                  targetTasks = found.data.tasks;
              } else if (found.tasks) {
                  targetTasks = found.tasks;
              }
              if (found.isPublic !== undefined) {
                  isPublic = found.isPublic;
              }
           }
        }
      }

      if (hasAccess) {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, role: fetchedRole, tasks: targetTasks, isPublic } : p));
        setActiveId(id);
      } else {
        alert("このプロジェクトは削除されたか、アクセス権限がありません。リストから削除します。");
        setProjects(prev => {
            const nextProjects = prev.filter(p => p.id !== id);
            if (activeId === id && nextProjects.length > 0) {
               setActiveId(nextProjects[0].id);
            }
            return nextProjects;
        });
      }
    } catch (e) {
      console.error("Verification failed", e);
      alert("プロジェクトの検証に失敗しました。ネットワークを確認してください。");
    } finally {
      window.dispatchEvent(new CustomEvent('project-verifying', { detail: false }));
    }
  };

  const deleteProject = async (id: string, deleteFromCloud: boolean = true) => {
    if (projects.length <= 1) { alert("最後のプロジェクトは削除できません。"); return; }
    
    const targetProject = projects.find(p => p.id === id);
    if (deleteFromCloud && targetProject && !String(targetProject.id).startsWith('local_') && targetProject.isCloudSync !== false) {
       try {
          const token = await getToken();
          await fetch(`http://localhost:5174/api/projects/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
       } catch (e) {
          console.error("Failed to delete from cloud", e);
       }
    }

    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    if (id === activeId) setActiveId(newProjects[0].id);
  };

  const getShareUrl = () => {
    if (!activeData) return '';
    const compressed = compressData(activeData);
    const isLocal = String(activeData.id).startsWith('local_') || activeData.isCloudSync === false;
    const basePath = isLocal || !activeData.shortId ? '/' : `/${activeData.shortId}/`;
    return `${window.location.origin}${basePath}?d=${compressed}`;
  };

  return { 
    data: activeData, setData: setActiveData, updateProject, replaceProject, incomingData, setIncomingData, getShareUrl,
    projects, activeId, addProject, importNewProject, switchProject, deleteProject,
    undo, redo, canUndo, canRedo,
    uploadProject, syncLimitState, resolveSyncLimit, currentLimit,
    syncState, addOrUpdateProject
  };
};