// 役割: アプリケーションの全体的なデータ状態（プロジェクト、タスク履歴、クラウド同期状態など）を管理するカスタムフック
import { useState, useEffect, useCallback, useRef} from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { AppData, Task } from '../types';
import { compressData, decompressData } from '../utils/compression';
import { useHistory } from './useHistory';
import tutorialData from '../data/tutorial.json';
import { recalculateStatus } from '../utils/taskUtils';

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
  const essentialTasks = project.tasks.map((t: Task) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    parentId: t.parentId,
    deadline: t.deadline,
    isDeleted: t.isDeleted,
    order: t.order
  }));
  const membersStr = project.members ? JSON.stringify(project.members) : '';
  const str = project.projectName + JSON.stringify(essentialTasks) + String(project.isPublic) + membersStr;
  
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0;
};

// UIスレッドをブロックしないように非同期でハッシュ計算を行う
const calculateHashAsync = (project: AppData): Promise<number> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(calculateHash(project));
    }, 0);
  });
};

const isEffectivelyIdentical = (local: AppData, incoming: AppData) => {
  const localActive = local.tasks.filter((t: Task) => !t.isDeleted);
  const incomingActive = incoming.tasks.filter((t: Task) => !t.isDeleted);

  if (localActive.length !== incomingActive.length) return false;

  const normalizeTask = (t: Task) => {
      const name = String(t.name || '').trim();
      const status = Number(t.status || 0);
      let d = 0;
      if (t.deadline) {
          const date = new Date(t.deadline);
          date.setHours(0, 0, 0, 0);
          d = date.getTime();
      }
      return `${name}|${status}|${d}`;
  };

  const localSigs = localActive.map(normalizeTask).sort();
  const incomingSigs = incomingActive.map(normalizeTask).sort();

  return localSigs.join('::') === incomingSigs.join('::');
};

export const useAppData = () => {
  const { getToken, isSignedIn } = useAuth();

  const { state: projects, setState: setProjects, resetState: resetProjects, undo: baseUndo, redo: baseRedo, canUndo, canRedo } = useHistory<AppData[]>([]);

  const projectsRef = useRef<AppData[]>(projects);
  useEffect(() => { projectsRef.current = projects; }, [projects]);

  const [activeId, setActiveId] = useState<string>('');
  const activeData = projects.find((p: AppData) => p.id === activeId) || null;
  const [incomingData, setIncomingData] = useState<AppData | null>(null);
  const isLoaded = useRef(false);
  
  const lastSyncedHashMap = useRef<Record<string, number>>({});
  const previousActiveIdRef = useRef<string>('');

  const [currentLimit, setCurrentLimit] = useState<number>(3);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'premium'>('free');
  const [syncLimitState, setSyncLimitState] = useState<{ isOverLimit: boolean, limit: number, cloudProjects: any[] } | null>(null);
  
  // 状態に error を追加
  const [syncState, setSyncState] = useState<'idle' | 'waiting' | 'syncing' | 'synced' | 'error'>('idle');

  // 非同期で計算された現在のハッシュ値を保持
  const [currentHash, setCurrentHash] = useState<number>(0);

  const initialUrlGuardRef = useRef(true);
  const syncAbortControllerRef = useRef<AbortController | null>(null);
  const initialCloudFetchDone = useRef(false);

  const getWaitTime = useCallback(() => {
    return currentPlan === 'premium' ? 10000 : 15000;
  }, [currentPlan]);

  const undo = useCallback(() => { baseUndo(); }, [baseUndo]);
  const redo = useCallback(() => { baseRedo(); }, [baseRedo]);

  // activeDataの変更時に非同期でハッシュを計算
  useEffect(() => {
    let isMounted = true;
    if (activeData) {
      calculateHashAsync(activeData).then(hash => {
        if (isMounted) setCurrentHash(hash);
      });
    }
    return () => { isMounted = false; };
  }, [activeData]);

  // ローカルストレージからのロード
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
            loadedProjects = parsed.map((p: any) => ({
              ...p,
              id: (isUUID(p.id) || String(p.id).startsWith('local_')) ? p.id : generateProjectId()
            }));
          } else {
            loadedProjects = [{ ...parsed, id: generateProjectId() }];
          }
        } catch (e) {
          console.error("Failed to parse local storage", e);
        }
      }

      const now = Date.now();
      const tutorialProject: AppData = {
        id: tutorialData.id,
        projectName: tutorialData.projectName,
        tasks: tutorialData.tasks.map((t: any) => ({ ...t, lastUpdated: now })) as Task[],
        lastSynced: now,
        isCloudSync: false,
        role: 'owner'
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

      for (const p of loadedProjects) {
        lastSyncedHashMap.current[p.id] = await calculateHashAsync(p);
      }
      
      resetProjects(loadedProjects);
      setActiveId(initialActiveId);
    };
    load();
  }, [resetProjects]);

  // 初回ロード時のクラウド同期処理
  useEffect(() => {
    if (!isSignedIn || initialCloudFetchDone.current) return;
    
    const abortController = new AbortController();

    const loadFromCloud = async () => {
      setSyncState('waiting');
      try {
        // プラン毎の待機時間を経過
        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, getWaitTime());
            abortController.signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(new DOMException('Aborted', 'AbortError'));
            });
        });

        if (abortController.signal.aborted) return;

        setSyncState('syncing');
        const token = await getToken();
        if (!token) throw new Error("No token");

        // クラウドデータを取得
        const res = await fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const resData = await res.json();
          const { projects: dbProjects, limit, plan } = resData;
          setCurrentLimit(limit);
          setCurrentPlan(plan || (limit > 3 ? 'premium' : 'free'));

          if (dbProjects.length > limit) {
              setSyncLimitState({ isOverLimit: true, limit, cloudProjects: dbProjects });
              setSyncState('error'); // エラー扱いに
              initialCloudFetchDone.current = true;
              return;
          }

          // クラウドデータをローカルデータにマージ
          const updatedProjects: AppData[] = [];
          setProjects(prev => {
              const next = [...prev];
              dbProjects.forEach((cp: any) => {
                  const exIdx = next.findIndex(p => p.id === cp.id);
                  let mergedProject: AppData;
                  if (exIdx === -1) {
                      mergedProject = {
                          id: cp.id, shortId: cp.shortId, projectName: cp.projectName,
                          tasks: recalculateStatus(cp.data?.tasks || cp.tasks || []),
                          lastSynced: cp.data?.lastSynced || Date.now(),
                          isCloudSync: true, role: cp.role || 'owner',
                          isPublic: cp.isPublic, members: cp.members || []
                      };
                      next.push(mergedProject);
                  } else {
                      const localP = next[exIdx];
                      const tMap = new Map<string, Task>();
                      (cp.data?.tasks || cp.tasks || []).forEach((t: Task) => tMap.set(t.id, t));
                      localP.tasks.forEach((lt: Task) => {
                          const ct = tMap.get(lt.id);
                          if (!ct || lt.lastUpdated > ct.lastUpdated) tMap.set(lt.id, lt);
                      });
                      mergedProject = {
                          ...cp,
                          projectName: localP.lastSynced > (cp.data?.lastSynced || 0) ? localP.projectName : cp.projectName,
                          tasks: recalculateStatus(Array.from(tMap.values())),
                          isCloudSync: true, role: cp.role || 'owner',
                          isPublic: cp.isPublic ?? localP.isPublic, 
                          members: cp.members ?? localP.members
                      };
                      next[exIdx] = mergedProject;
                  }
                  updatedProjects.push(mergedProject);
              });
              return next;
          });

          // ハッシュ計算
          for (const p of updatedProjects) {
              lastSyncedHashMap.current[p.id] = await calculateHashAsync(p);
          }
          
          setActiveId(prevId => {
              if (dbProjects.length > 0) {
                  const currentProj = projectsRef.current.find(p => p.id === prevId);
                  // 未編集の初期プロジェクトならクラウドのものに切り替える
                  if (!currentProj || (String(prevId).startsWith('local_') && (currentProj.tasks.length === 0 || currentProj.projectName === 'マイプロジェクト'))) {
                      return dbProjects[0].id;
                  }
              }
              return prevId;
          });

          setSyncState('synced');
          initialCloudFetchDone.current = true;
        } else {
          setSyncState('error');
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error('クラウドからのデータ読み込みに失敗しました', e);
        setSyncState('error');
      }
    };

    loadFromCloud();
    return () => { abortController.abort(); };
  }, [isSignedIn, getToken, getWaitTime, setProjects]);


  const triggerSyncFlow = useCallback(async (projectId: string, forceFetch: boolean, abortSignal: AbortSignal) => {
      setSyncState('waiting');

      try {
          const targetProject = projectsRef.current.find(p => p.id === projectId);
          if (!targetProject) return;

          let calculatedHash = 0;

          // 1. プラン毎の待機時間を経過させつつ、その間に裏で非同期に差分計算を行う
          await Promise.all([
              new Promise<void>((resolve, reject) => {
                  const timer = setTimeout(resolve, getWaitTime());
                  abortSignal.addEventListener('abort', () => {
                      clearTimeout(timer);
                      reject(new DOMException('Aborted', 'AbortError'));
                  });
              }),
              calculateHashAsync(targetProject).then(h => { calculatedHash = h; })
          ]);

          if (abortSignal.aborted) return;

          // 待機時間中に計算した結果、差分がなければ同期処理(APIフェッチ)を中止
          if (!forceFetch && lastSyncedHashMap.current[projectId] === calculatedHash) {
              setSyncState('synced');
              return;
          }

          setSyncState('syncing');
          const token = await getToken();
          if (!token) throw new Error("No token");

          // 2. クラウドデータを取得
          let cloudProject = null;
          let fetchedRole = targetProject.role;
          let isPublic = targetProject.isPublic;

          const res = await fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) {
              const resData = await res.json();
              const { projects: dbProjects, limit, plan } = resData;
              setCurrentLimit(limit);
              setCurrentPlan(plan || (limit > 3 ? 'premium' : 'free'));

              if (dbProjects.length > limit) {
                  setSyncLimitState({ isOverLimit: true, limit, cloudProjects: dbProjects });
                  setSyncState('error');
                  return;
              }

              const found = dbProjects.find((p: any) => p.id === projectId);
              if (found) {
                  cloudProject = found;
                  fetchedRole = found.role || 'owner';
                  isPublic = found.isPublic;
              }

              setProjects(prev => {
                  const next = [...prev];
                  dbProjects.forEach((cp: any) => {
                      if (cp.id !== projectId) {
                          const exIdx = next.findIndex(p => p.id === cp.id);
                          if (exIdx === -1) {
                              next.push({
                                  id: cp.id, shortId: cp.shortId, projectName: cp.projectName,
                                  tasks: recalculateStatus(cp.data?.tasks || cp.tasks || []),
                                  lastSynced: cp.data?.lastSynced || Date.now(),
                                  isCloudSync: true, role: cp.role || 'owner'
                              });
                          } else {
                              const localP = next[exIdx];
                              const tMap = new Map<string, Task>();
                              (cp.data?.tasks || cp.tasks || []).forEach((t: Task) => tMap.set(t.id, t));
                              localP.tasks.forEach((lt: Task) => {
                                  const ct = tMap.get(lt.id);
                                  if (!ct || lt.lastUpdated > ct.lastUpdated) tMap.set(lt.id, lt);
                              });
                              next[exIdx] = {
                                  ...cp,
                                  projectName: localP.lastSynced > (cp.data?.lastSynced || 0) ? localP.projectName : cp.projectName,
                                  tasks: recalculateStatus(Array.from(tMap.values())),
                                  isCloudSync: true, role: cp.role || 'owner'
                              };
                          }
                      }
                  });
                  return next;
              });
          }

          if (abortSignal.aborted) return;

          if (targetProject.shortId && !cloudProject) {
              const sharedRes = await fetch(`/api/projects/shared/${targetProject.shortId}`, { headers: { 'Authorization': `Bearer ${token}` } });
              if (sharedRes.ok) {
                  const sharedResult = await sharedRes.json();
                  if (sharedResult.success && sharedResult.project) {
                      cloudProject = sharedResult.project;
                      fetchedRole = sharedResult.role;
                  } else {
                      fetchedRole = 'none' as any;
                  }
              } else {
                  fetchedRole = 'none' as any;
              }
          }

          if (abortSignal.aborted) return;

          if (fetchedRole === 'viewer' || fetchedRole === ('none' as any)) {
              const rollbackTasks = cloudProject ? recalculateStatus(cloudProject.data?.tasks || cloudProject.tasks || []) : targetProject.tasks;
              const rollbackName = cloudProject ? (cloudProject.projectName) : targetProject.projectName;
              setProjects(prev => prev.map(p => p.id === projectId ? {
                  ...p, role: fetchedRole, tasks: rollbackTasks, projectName: rollbackName, lastSynced: Date.now()
              } : p));
              setSyncState('error');
              if (fetchedRole !== 'viewer') alert('アクセス権限がありません。クラウドの最新状態にリセットされました。');
              return;
          }

          // 3. マージ処理
          let mergedTasks = [...targetProject.tasks];
          let mergedProjectName = targetProject.projectName;
          let mergedIsPublic = targetProject.isPublic;

          if (cloudProject) {
              const cloudTasks = cloudProject.data?.tasks || cloudProject.tasks || [];
              const taskMap = new Map<string, Task>();
              cloudTasks.forEach((ct: Task) => taskMap.set(ct.id, ct));
              
              targetProject.tasks.forEach((lt: Task) => {
                  const ct = taskMap.get(lt.id);
                  if (!ct || lt.lastUpdated > ct.lastUpdated) {
                      taskMap.set(lt.id, lt);
                  }
              });
              
              await new Promise(r => setTimeout(r, 0));
              mergedTasks = recalculateStatus(Array.from(taskMap.values()));
              
              const cloudLastSynced = cloudProject.data?.lastSynced || 0;
              if (cloudLastSynced > targetProject.lastSynced) {
                  mergedProjectName = cloudProject.projectName;
                  mergedIsPublic = cloudProject.isPublic ?? targetProject.isPublic;
              }
          }

          if (abortSignal.aborted) return;

          // アップロード前の最終差分チェックも非同期に行う
          let requiresUpload = true;
          if (cloudProject) {
              const cloudTasks = cloudProject.data?.tasks || cloudProject.tasks || [];
              const [cloudHash, mergedHash] = await Promise.all([
                  calculateHashAsync({
                      ...targetProject,
                      projectName: cloudProject.projectName,
                      tasks: cloudTasks,
                      isPublic: cloudProject.isPublic ?? targetProject.isPublic,
                      members: cloudProject.members ?? targetProject.members
                  }),
                  calculateHashAsync({
                      ...targetProject,
                      projectName: mergedProjectName,
                      tasks: mergedTasks,
                      isPublic: mergedIsPublic,
                      members: targetProject.members
                  })
              ]);

              if (cloudHash === mergedHash) {
                  requiresUpload = false;
              }
          }

          // 4. アップロード処理またはスキップ
          const syncNow = Date.now();

          if (requiresUpload) {
              const uploadRes = await fetch('/api/projects', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      id: targetProject.id, 
                      shortId: targetProject.shortId,
                      projectName: mergedProjectName, 
                      data: { tasks: mergedTasks, lastSynced: syncNow } 
                  })
              });

              if (abortSignal.aborted) return;

              if (uploadRes.ok) {
                  const finalMergedProject = {
                      ...targetProject, 
                      projectName: mergedProjectName, 
                      tasks: mergedTasks,
                      role: fetchedRole, 
                      isPublic: mergedIsPublic, 
                      lastSynced: syncNow
                  };
                  
                  lastSyncedHashMap.current[targetProject.id] = await calculateHashAsync(finalMergedProject);
                  setProjects(prev => prev.map(p => p.id === targetProject.id ? finalMergedProject : p));
                  setSyncState('synced');
              } else if (uploadRes.status === 403) {
                  const errData = await uploadRes.json().catch(() => ({}));
                  setProjects(prev => prev.map(p => p.id === targetProject.id ? { ...p, role: errData.role || 'viewer' } : p));
                  setSyncState('error');
                  alert('権限が変更されたため、変更を保存できません。');
              } else {
                  setSyncState('error');
              }
          } else {
              // 差分がないのでアップロードをスキップ
              const finalMergedProject = {
                  ...targetProject, 
                  projectName: mergedProjectName, 
                  tasks: mergedTasks,
                  role: fetchedRole, 
                  isPublic: mergedIsPublic, 
                  lastSynced: cloudProject?.data?.lastSynced || targetProject.lastSynced
              };
              lastSyncedHashMap.current[targetProject.id] = await calculateHashAsync(finalMergedProject);
              setProjects(prev => prev.map(p => p.id === targetProject.id ? finalMergedProject : p));
              setSyncState('synced');
          }

      } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          console.error('クラウド同期エラー', e);
          setSyncState('error');
      }
  }, [getToken, getWaitTime, setProjects]);

  const activeProjectId = activeData?.id || '';
  const isCloudProject = activeData?.isCloudSync !== false && activeData?.role !== 'viewer';

  // プロジェクト切り替え・タスク変更を全て一元監視するトリガー
  useEffect(() => {
    if (!isSignedIn || !activeProjectId || activeProjectId.startsWith('local_') || !isCloudProject) {
      return;
    }

    const isProjectChanged = previousActiveIdRef.current !== activeProjectId;
    
    if (!isProjectChanged && lastSyncedHashMap.current[activeProjectId] === currentHash) {
      if (syncAbortControllerRef.current) {
          syncAbortControllerRef.current.abort();
      }
      setSyncState('synced');
      return;
    }

    previousActiveIdRef.current = activeProjectId;

    if (syncAbortControllerRef.current) {
        syncAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    syncAbortControllerRef.current = abortController;

    triggerSyncFlow(activeProjectId, isProjectChanged, abortController.signal);

    return () => { abortController.abort(); };
  }, [activeProjectId, currentHash, isSignedIn, isCloudProject, triggerSyncFlow]);


  const resolveSyncLimit = async (selectedCloudIds: string[]) => {
    if (!syncLimitState) return;
    const token = await getToken();
    const unselected = syncLimitState.cloudProjects.filter(p => !selectedCloudIds.includes(p.id));
    
    for (const p of unselected) {
       try { await fetch(`/api/projects/${p.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); } catch (e) { console.error(e) }
    }

    const downgradedLocal: AppData[] = unselected.map((row: any) => ({
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
    const target = projects.find((p: AppData) => p.id === localId);
    if (!target) return;
    
    const cloudCount = projects.filter((p: AppData) => !String(p.id).startsWith('local_') && p.isCloudSync !== false).length;
    if (cloudCount >= currentLimit) {
      alert(`プランのアップロード上限（${currentLimit}件）に達しています。`);
      return;
    }

    try {
      setSyncState('syncing');
      const token = await getToken();
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id, shortId: target.shortId, projectName: target.projectName, data: { tasks: target.tasks, lastSynced: target.lastSynced } })
      });

      if (res.ok) {
        const resData = await res.json();
        const finalId = resData.newId || target.id;
        const finalShortId = resData.shortId || target.shortId;
        
        const finalProject = { ...target, id: finalId, shortId: finalShortId, isCloudSync: true, role: 'owner' as const };
        lastSyncedHashMap.current[finalId] = await calculateHashAsync(finalProject);
        
        setProjects(prev => prev.map(p => p.id === localId ? finalProject : p));
        if (activeId === localId && resData.newId) setActiveId(finalId);
        setSyncState('synced');
        alert('クラウドにアップロードしました！');
      } else {
        setSyncState('error');
        alert('アップロードに失敗しました');
      }
    } catch (e) {
      console.error(e);
      setSyncState('error');
    }
  };

  // 手動で同期処理を開始する関数
  const forceSync = useCallback(() => {
    if (!activeData || !isSignedIn || String(activeData.id).startsWith('local_') || activeData.isCloudSync === false) return;
    
    if (syncAbortControllerRef.current) {
        syncAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    syncAbortControllerRef.current = abortController;

    // forceFetchをtrueにして同期フローを実行
    triggerSyncFlow(activeData.id, true, abortController.signal);
  }, [activeData, isSignedIn, triggerSyncFlow]);

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

      const compressed = compressData(activeData);
      const isLocal = String(activeData.id).startsWith('local_') || activeData.isCloudSync === false;
      const basePath = isLocal || !activeData.shortId ? '/' : `/${activeData.shortId}/`;
      window.history.replaceState(null, '', `${window.location.origin}${basePath}?d=${compressed}`);
    }
  }, [activeData]);

  const addOrUpdateProject = useCallback((newData: AppData) => {
    setProjects(prev => prev.some(p => p.id === newData.id) ? prev.map(p => p.id === newData.id ? newData : p) : [...prev, newData]);
    setActiveId(newData.id);
  }, [setProjects]);

  const setActiveData = (newData: AppData) => { setProjects(prev => prev.map(p => p.id === newData.id ? newData : p)); };
  const updateProject = useCallback((updatedProject: AppData) => { setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p)); }, [setProjects]);
  const replaceProject = useCallback((oldId: string, newData: AppData) => { setProjects(prev => prev.map(p => p.id === oldId ? newData : p)); }, [setProjects]);

  const addProject = () => {
    const newProject = createDefaultProject();
    let nameCandidate = 'マイプロジェクト', counter = 1;
    while (projects.some((p: AppData) => p.projectName === nameCandidate)) nameCandidate = `マイプロジェクト ${++counter}`;
    newProject.projectName = nameCandidate;
    setProjects(prev => [...prev, newProject]);
    setActiveId(newProject.id);
  };

  const importNewProject = (data: AppData) => {
    let name = data.projectName, suffix = 1;
    while(projects.some((p: AppData) => p.projectName === name)) name = `${data.projectName} (${suffix++})`;
    const newProject = { ...data, id: generateProjectId(), projectName: name };
    setProjects(prev => [...prev, newProject]);
    setActiveId(newProject.id);
    setIncomingData(null);
  };

  const switchProject = async (id: string) => { 
    setActiveId(id);
  };

  const deleteProject = async (id: string, deleteFromCloud: boolean = true) => {
    if (projects.length <= 1) { alert("最後のプロジェクトは削除できません。"); return; }
    
    const targetProject = projects.find((p: AppData) => p.id === id);
    if (deleteFromCloud && targetProject && !String(targetProject.id).startsWith('local_') && targetProject.isCloudSync !== false) {
       try {
          const token = await getToken();
          await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
       } catch (e) {
          console.error("Failed to delete from cloud", e);
       }
    }

    const newProjects = projects.filter((p: AppData) => p.id !== id);
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
    syncState, addOrUpdateProject, forceSync
  };
};