// 役割: アプリケーションの全体的なデータ状態（プロジェクト、タスク履歴、クラウド同期状態など）を管理するカスタムフック
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const str = project.projectName + JSON.stringify(essentialTasks);
  
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0;
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
  const [syncState, setSyncState] = useState<'idle' | 'waiting' | 'syncing' | 'synced'>('idle');

  const initialUrlGuardRef = useRef(true);
  const syncAbortControllerRef = useRef<AbortController | null>(null);

  const getWaitTime = useCallback(() => {
    return currentPlan === 'premium' ? 10000 : 15000;
  }, [currentPlan]);

  const undo = useCallback(() => { baseUndo(); }, [baseUndo]);
  const redo = useCallback(() => { baseRedo(); }, [baseRedo]);

  // ローカルストレージからの読み込み
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

      loadedProjects.forEach(p => { lastSyncedHashMap.current[p.id] = calculateHash(p); });
      resetProjects(loadedProjects);
      setActiveId(initialActiveId);
    };
    load();
  }, [resetProjects]);

  // ==========================================
  // 全同期処理を統合したフロー
  // ==========================================
  const triggerSyncFlow = useCallback(async (projectId: string, abortSignal: AbortSignal) => {
      setSyncState('waiting');

      try {
          // 1. プラン毎の待機時間を経過（操作があるたびにリセット＝実質デバウンス）
          await new Promise<void>((resolve, reject) => {
              const timer = setTimeout(resolve, getWaitTime());
              abortSignal.addEventListener('abort', () => {
                  clearTimeout(timer);
                  reject(new DOMException('Aborted', 'AbortError'));
              });
          });

          setSyncState('syncing');
          const token = await getToken();
          if (!token) throw new Error("No token");

          const targetProject = projectsRef.current.find(p => p.id === projectId);
          if (!targetProject) return;

          // 2. クラウドデータを取得（全プロジェクト一覧）
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
                  setSyncState('idle');
                  return;
              }

              const found = dbProjects.find((p: any) => p.id === projectId);
              if (found) {
                  cloudProject = found;
                  fetchedRole = found.role || 'owner';
                  isPublic = found.isPublic;
              }

              // DBの他のプロジェクトもローカルリストに反映（一覧表示用）
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

          // 共有プロジェクトで一覧にない場合のフォールバック取得
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
              setSyncState('idle');
              if (fetchedRole !== 'viewer') alert('アクセス権限がありません。クラウドの最新状態にリセットされました。');
              return;
          }

          // 3. クラウドデータをローカルデータにマージ
          let mergedTasks = [...targetProject.tasks];
          let mergedProjectName = targetProject.projectName;

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
              mergedTasks = recalculateStatus(Array.from(taskMap.values()));
              mergedProjectName = targetProject.lastSynced > (cloudProject.data?.lastSynced || 0) ? targetProject.projectName : cloudProject.projectName;
          }

          if (abortSignal.aborted) return;

          // 4. マージデータをアップロード
          const syncNow = Date.now();
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
                  ...targetProject, projectName: mergedProjectName, tasks: mergedTasks,
                  role: fetchedRole, isPublic, lastSynced: syncNow
              };
              
              lastSyncedHashMap.current[targetProject.id] = calculateHash(finalMergedProject);
              setProjects(prev => prev.map(p => p.id === targetProject.id ? finalMergedProject : p));
              setSyncState('synced');
          } else if (uploadRes.status === 403) {
              const errData = await uploadRes.json().catch(() => ({}));
              setProjects(prev => prev.map(p => p.id === targetProject.id ? { ...p, role: errData.role || 'viewer' } : p));
              setSyncState('idle');
              alert('権限が変更されたため、変更を保存できませんでした。');
          } else {
              setSyncState('idle');
          }

      } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          console.error('クラウド同期エラー', e);
          setSyncState('idle');
      }
  }, [getToken, getWaitTime, setProjects]);

  // 初回ロード・プロジェクト切り替え・タスク変更を全て一元監視するトリガー
  useEffect(() => {
    if (!isSignedIn || !activeData || String(activeData.id).startsWith('local_') || activeData.isCloudSync === false || activeData.role === 'viewer') {
      return;
    }

    const currentHash = calculateHash(activeData);
    const isProjectChanged = previousActiveIdRef.current !== activeData.id;
    
    // プロジェクトが同じでハッシュも同じなら（同期直後のUI更新等）スキップ
    if (!isProjectChanged && lastSyncedHashMap.current[activeData.id] === currentHash) {
      setSyncState(prev => (prev === 'waiting' || prev === 'syncing') ? prev : 'synced');
      return;
    }

    previousActiveIdRef.current = activeData.id;

    if (syncAbortControllerRef.current) {
        syncAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    syncAbortControllerRef.current = abortController;

    triggerSyncFlow(activeData.id, abortController.signal);

    return () => { abortController.abort(); };
  }, [activeData, isSignedIn, triggerSyncFlow]);


  const resolveSyncLimit = async (selectedCloudIds: string[]) => {
    if (!syncLimitState) return;
    const token = await getToken();
    const unselected = syncLimitState.cloudProjects.filter(p => !selectedCloudIds.includes(p.id));
    
    for (const p of unselected) {
       try { await fetch(`/api/projects/${p.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); } catch (e) { console.error(e) }
    }

    // 選択されたものをローカルに追加し直す等の処理
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
        lastSyncedHashMap.current[finalId] = calculateHash(target);
        
        setProjects(prev => prev.map(p => p.id === localId ? { ...p, id: finalId, shortId: finalShortId, isCloudSync: true, role: 'owner' as const } : p));
        if (activeId === localId && resData.newId) setActiveId(finalId);
        setSyncState('synced');
        alert('クラウドにアップロードしました！');
      } else {
        setSyncState('idle');
        alert('アップロードに失敗しました');
      }
    } catch (e) {
      console.error(e);
      setSyncState('idle');
    }
  };

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
    // ここではActiveIdを変えるだけ。残りの待機->取得->マージ->アップロードはuseEffectに一任
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
    syncState, addOrUpdateProject
  };
};