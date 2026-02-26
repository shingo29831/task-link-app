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
  lastSynced: Date.now()
});

// ★ 追加: 最も計算が軽量なハッシュ関数 (djb2アルゴリズム)
// 文字列から高速に一意な32ビット整数を生成します
const calculateHash = (project: AppData): number => {
  // 更新日時(lastUpdated)などのメタデータを除外し、タスクの本質的な構成のみを抽出
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
    hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
  }
  return hash >>> 0; // 符号なし32ビット整数に変換
};

export const useAppData = () => {
  const { getToken, isSignedIn } = useAuth();

  const { state: projects, setState: setProjects, resetState: resetProjects, undo, redo, canUndo, canRedo } = useHistory<AppData[]>([]);

  const [activeId, setActiveId] = useState<string>('');
  const activeData = projects.find(p => p.id === activeId) || null;
  const [incomingData, setIncomingData] = useState<AppData | null>(null);
  const isLoaded = useRef(false);
  
  // ★ 変更: ハッシュ値(数値)で前回同期状態を記録する
  const lastSyncedHashMap = useRef<Record<string, number>>({});

  const [currentLimit, setCurrentLimit] = useState<number>(3);
  const [syncLimitState, setSyncLimitState] = useState<{ isOverLimit: boolean, limit: number, cloudProjects: any[] } | null>(null);
  
  const [syncState, setSyncState] = useState<'idle' | 'waiting' | 'syncing' | 'synced'>('idle');

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
      
      const params = new URLSearchParams(window.location.search);
      const compressed = params.get('d');
      let newIncoming: AppData | null = null;

      if (compressed) {
        const incoming = decompressData(compressed);
        if (incoming) {
          incoming.id = generateProjectId();
          newIncoming = incoming;
        }
      }

      if (newIncoming) {
        setIncomingData(newIncoming);
        window.history.replaceState(null, '', window.location.pathname);
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
        projectName: row.projectName,
        tasks: row.data.tasks || [],
        lastSynced: row.data.lastSynced || Date.now()
      };
      // ダウンロードした状態のハッシュを記録
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, getToken]);

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
      lastSynced: Date.now()
    }));
    setProjects(prev => [...prev, ...downgradedLocal]);
    setSyncLimitState(null);
  };

  const uploadProject = async (localId: string) => {
    const target = projects.find(p => p.id === localId);
    if (!target) return;
    
    const cloudCount = projects.filter(p => !String(p.id).startsWith('local_')).length;
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
        body: JSON.stringify({ id: target.id, projectName: target.projectName, data: { tasks: target.tasks, lastSynced: target.lastSynced } })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.newId) {
          lastSyncedHashMap.current[data.newId] = calculateHash(target);
          setProjects(prev => prev.map(p => p.id === localId ? { ...p, id: data.newId } : p));
          if (activeId === localId) setActiveId(data.newId);
          setSyncState('synced');
          alert('クラウドにアップロードしました！\n今後は自動的に同期されます。');
        }
      } else {
        setSyncState('idle');
      }
    } catch (e) {
      console.error(e);
      setSyncState('idle');
      alert('アップロードに失敗しました');
    }
  };

  useEffect(() => {
    if (!isSignedIn || !activeData || String(activeData.id).startsWith('local_')) {
      return;
    }

    // ★ 1. 瞬時にハッシュを計算
    const currentHash = calculateHash(activeData);

    // ★ 2. 前回同期時とハッシュが同じなら、即座にローディングを止める（15秒待たない）
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

            // ダウンロードしたデータと、マージ後のデータが同じ（差分なし）かハッシュで判定
            const cloudHash = calculateHash({ ...activeData, projectName: cloudProject.projectName, tasks: cloudTasks });
            const mergedHash = calculateHash({ ...activeData, projectName: mergedProjectName, tasks: mergedTasks });

            if (mergedHash === cloudHash) {
                isSameAsCloud = true;
            }
          }
        }

        const mergedProjectData = { ...activeData, projectName: mergedProjectName, tasks: mergedTasks };
        const newMergedHash = calculateHash(mergedProjectData);

        // ★ ダウンロード時点と差分がなければ、POST通信をスキップする
        if (isSameAsCloud) {
          console.log(`プロジェクト "${mergedProjectName}" はクラウドと差分がないためアップロードをスキップしました`);
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
          // 成功したら新しいハッシュを記録
          lastSyncedHashMap.current[activeData.id] = newMergedHash;

          if (requiresLocalUpdate) {
             setProjects(prev => prev.map(p => p.id === activeData.id ? { ...p, tasks: mergedTasks, projectName: mergedProjectName, lastSynced: Date.now() } : p));
          }
          
          setSyncState('synced');
          console.log(`プロジェクト "${mergedProjectName}" をクラウドに保存しました！`);
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
      const compressed = compressData(activeData);
      window.history.replaceState(null, '', `${window.location.origin}${window.location.pathname}?d=${compressed}`);
    }
  }, [activeData]);

  const setActiveData = (newData: AppData) => { setProjects(prev => prev.map(p => p.id === newData.id ? newData : p)); };
  const updateProject = useCallback((updatedProject: AppData) => { setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p)); }, [setProjects]);

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

  const switchProject = (id: string) => { if (projects.some(p => p.id === id)) setActiveId(id); };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) { alert("最後のプロジェクトは削除できません。"); return; }
    if (!confirm("このプロジェクトを削除しますか？")) return;
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    if (id === activeId) setActiveId(newProjects[0].id);
  };

  const getShareUrl = () => {
    if (!activeData) return '';
    return `${window.location.origin}${window.location.pathname}?d=${compressData(activeData)}`;
  };

  return { 
    data: activeData, setData: setActiveData, updateProject, incomingData, setIncomingData, getShareUrl,
    projects, activeId, addProject, importNewProject, switchProject, deleteProject,
    undo, redo, canUndo, canRedo,
    uploadProject, syncLimitState, resolveSyncLimit, currentLimit,
    syncState
  };
};