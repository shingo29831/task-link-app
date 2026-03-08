// 役割: クラウドとの同期フロー（自動・手動）、アップロード、マージ処理の管理

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { AppData, Task } from '../types';
import { recalculateStatus } from '../utils/taskUtils';
import { calculateHashAsync, generateProjectId } from '../utils/projectUtils';

export const useCloudSync = (
  activeData: AppData | null,
  activeId: string,
  projectsRef: React.MutableRefObject<AppData[]>,
  setProjects: React.Dispatch<React.SetStateAction<AppData[]>>,
  setActiveId: React.Dispatch<React.SetStateAction<string>>,
  lastSyncedHashMap: React.MutableRefObject<Record<string, number>>
) => {
  const { getToken, isSignedIn } = useAuth();
  
  const [currentLimit, setCurrentLimit] = useState<number>(3);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'premium'>('free');
  const [syncLimitState, setSyncLimitState] = useState<{ isOverLimit: boolean, limit: number, cloudProjects: any[] } | null>(null);
  const [syncState, setSyncState] = useState<'idle' | 'waiting' | 'syncing' | 'synced' | 'error'>('idle');
  const [currentHashInfo, setCurrentHashInfo] = useState<{ id: string, hash: number }>({ id: '', hash: 0 });
  
  // 追加: クラウドの初回取得が完了したことをトリガーにするためのState
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);

  const syncAbortControllerRef = useRef<AbortController | null>(null);
  const initialCloudFetchDone = useRef(false);
  const previousActiveIdRef = useRef<string>('');
  const previousHashRef = useRef<number>(0);

  const getWaitTime = useCallback(() => currentPlan === 'premium' ? 10000 : 15000, [currentPlan]);

  useEffect(() => {
    let isMounted = true;
    if (activeData) { 
      const id = activeData.id;
      calculateHashAsync(activeData).then(hash => { 
        if (isMounted) setCurrentHashInfo({ id, hash }); 
      }); 
    }
    return () => { isMounted = false; };
  }, [activeData]);

  // 初回ロード時のクラウド同期処理
  useEffect(() => {
    if (!isSignedIn || initialCloudFetchDone.current) return;
    const abortController = new AbortController();

    const loadFromCloud = async () => {
      // ローカルプロジェクト（またはクラウド非対応）の場合は表示上待ち状態（スピナー）を出さないようにする
      const isInitialLocal = activeId && (activeId.startsWith('local_') || activeData?.isCloudSync === false);
      if (!isInitialLocal) {
        setSyncState('syncing'); // 待機せず即座に取得開始するため syncing を設定
      }
      
      try {
        const token = await getToken();
        if (!token) throw new Error("No token");

        const res = await fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error("Failed to fetch cloud projects");

        const resData = await res.json();
        const { projects: dbProjects, limit, plan } = resData;
        setCurrentLimit(limit);
        setCurrentPlan(plan || (limit > 3 ? 'premium' : 'free'));

        if (dbProjects.length > limit) {
            setSyncLimitState({ isOverLimit: true, limit, cloudProjects: dbProjects });
            if (!isInitialLocal) setSyncState('error');
            initialCloudFetchDone.current = true;
            setIsCloudLoaded(true);
            return;
        }

        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const params = new URLSearchParams(window.location.search);
        const isCleanUrlAccess = pathParts.length === 1 && !params.has('d');
        const targetShortId = isCleanUrlAccess ? pathParts[0] : null;

        const updatedProjects: AppData[] = [];
        setProjects(prev => {
            const next = [...prev];
            dbProjects.forEach((cp: any) => {
                const exIdx = next.findIndex(p => p.id === cp.id);
                let mergedProject: AppData;
                
                const isTargetCleanProject = isCleanUrlAccess && cp.shortId === targetShortId;

                if (exIdx === -1 || isTargetCleanProject) {
                    const existingP = next[exIdx];
                    mergedProject = {
                        id: cp.id, shortId: cp.shortId, projectName: cp.projectName,
                        tasks: recalculateStatus(cp.data?.tasks || cp.tasks || []),
                        lastSynced: cp.data?.lastSynced || Date.now(),
                        isCloudSync: true, role: cp.role || 'owner',
                        isPublic: cp.isPublic, members: cp.members || [],
                        // なぜ: URLパラメータに基づくフラグをクラウドデータで上書きして消さないため
                        includeDataInLink: existingP?.includeDataInLink
                    };
                    if (exIdx === -1) next.push(mergedProject);
                    else next[exIdx] = mergedProject;
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
                        isPublic: cp.isPublic ?? localP.isPublic, members: cp.members ?? localP.members,
                        // なぜ: URLパラメータに基づくフラグをクラウドデータで上書きして消さないため
                        includeDataInLink: localP.includeDataInLink
                    };
                    next[exIdx] = mergedProject;
                }
                updatedProjects.push(mergedProject);
            });
            return next;
        });

        for (const p of updatedProjects) lastSyncedHashMap.current[p.id] = await calculateHashAsync(p);
        
        setActiveId(prevId => {
            if (dbProjects.length > 0) {
                const currentProj = projectsRef.current.find(p => p.id === prevId);
                if (!currentProj || (String(prevId).startsWith('local_') && (currentProj.tasks.length === 0 || currentProj.projectName === 'マイプロジェクト'))) {
                    return dbProjects[0].id;
                }
            }
            return prevId;
        });
        
        if (!isInitialLocal) {
          setSyncState('synced');
        } else {
          setSyncState('idle'); // ローカルの時はidleに戻す
        }
        initialCloudFetchDone.current = true;
        setIsCloudLoaded(true); // 初回ロード完了を通知
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error('クラウドからのデータ読み込みに失敗しました', e);
        const isInitialLocalError = activeId && (activeId.startsWith('local_') || activeData?.isCloudSync === false);
        if (!isInitialLocalError) {
          setSyncState('error');
        } else {
          setSyncState('idle');
        }
        initialCloudFetchDone.current = true;
        setIsCloudLoaded(true);
      }
    };

    loadFromCloud();
    return () => { abortController.abort(); };
  }, [isSignedIn, getToken, setProjects, projectsRef, setActiveId, lastSyncedHashMap]);

  const triggerSyncFlow = useCallback(async (projectId: string, forceFetch: boolean, abortSignal: AbortSignal) => {
      setSyncState('waiting');
      try {
          const targetProject = projectsRef.current.find(p => p.id === projectId);
          if (!targetProject) return;

          let calculatedHash = 0;
          await Promise.all([
              new Promise<void>((resolve, reject) => {
                  const timer = setTimeout(resolve, getWaitTime());
                  abortSignal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
              }),
              calculateHashAsync(targetProject).then(h => { calculatedHash = h; })
          ]);
          if (abortSignal.aborted) return;
          if (!forceFetch && lastSyncedHashMap.current[projectId] === calculatedHash) { setSyncState('synced'); return; }

          setSyncState('syncing');
          const token = await getToken();
          if (!token) throw new Error("No token");

          let cloudProject = null;
          let fetchedRole = targetProject.role;

          const res = await fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } });
          if (!res.ok) throw new Error("Failed to fetch cloud projects");

          const resData = await res.json();
          const { projects: dbProjects, limit, plan } = resData;
          setCurrentLimit(limit); setCurrentPlan(plan || (limit > 3 ? 'premium' : 'free'));

          if (dbProjects.length > limit) {
              setSyncLimitState({ isOverLimit: true, limit, cloudProjects: dbProjects });
              setSyncState('error');
              return;
          }

          const found = dbProjects.find((p: any) => p.id === projectId);
          if (found) { cloudProject = found; fetchedRole = found.role || 'owner'; }

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
                              ...cp, projectName: localP.lastSynced > (cp.data?.lastSynced || 0) ? localP.projectName : cp.projectName,
                              tasks: recalculateStatus(Array.from(tMap.values())), isCloudSync: true, role: cp.role || 'owner',
                              // なぜ: 同期時に他プロジェクトのフラグが消えないようにするため
                              includeDataInLink: localP.includeDataInLink
                          };
                      }
                  }
              });
              return next;
          });

          if (abortSignal.aborted) return;

          if (targetProject.shortId && !cloudProject) {
              const sharedRes = await fetch(`/api/projects/shared/${targetProject.shortId}`, { headers: { 'Authorization': `Bearer ${token}` } });
              if (!sharedRes.ok) throw new Error("Failed to fetch shared project");
              const sharedResult = await sharedRes.json();
              if (sharedResult.success && sharedResult.project) { cloudProject = sharedResult.project; fetchedRole = sharedResult.role; } 
              else { fetchedRole = 'none' as any; }
          }
          if (abortSignal.aborted) return;

          if (fetchedRole === 'viewer' || fetchedRole === ('none' as any)) {
              const rollbackTasks = cloudProject ? recalculateStatus(cloudProject.data?.tasks || cloudProject.tasks || []) : targetProject.tasks;
              const rollbackName = cloudProject ? (cloudProject.projectName) : targetProject.projectName;
              setProjects(prev => prev.map(p => p.id === projectId ? { ...p, role: fetchedRole, tasks: rollbackTasks, projectName: rollbackName, lastSynced: Date.now() } : p));
              setSyncState('error');
              if (fetchedRole !== 'viewer') alert('アクセス権限がありません。クラウドの最新状態にリセットされました。');
              return;
          }

          let mergedTasks = [...targetProject.tasks];
          let mergedProjectName = targetProject.projectName;
          let mergedIsPublic = targetProject.isPublic;

          if (cloudProject) {
              const cloudTasks = cloudProject.data?.tasks || cloudProject.tasks || [];
              const taskMap = new Map<string, Task>();
              cloudTasks.forEach((ct: Task) => taskMap.set(ct.id, ct));
              targetProject.tasks.forEach((lt: Task) => {
                  const ct = taskMap.get(lt.id);
                  if (!ct || lt.lastUpdated > ct.lastUpdated) taskMap.set(lt.id, lt);
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

          let requiresUpload = true;
          if (cloudProject) {
              const cloudTasks = cloudProject.data?.tasks || cloudProject.tasks || [];
              const [cloudHash, mergedHash] = await Promise.all([
                  calculateHashAsync({ ...targetProject, projectName: cloudProject.projectName, tasks: cloudTasks, isPublic: cloudProject.isPublic ?? targetProject.isPublic, members: cloudProject.members ?? targetProject.members }),
                  calculateHashAsync({ ...targetProject, projectName: mergedProjectName, tasks: mergedTasks, isPublic: mergedIsPublic, members: targetProject.members })
              ]);
              if (cloudHash === mergedHash) requiresUpload = false;
          }

          const syncNow = Date.now();
          if (requiresUpload) {
              const uploadRes = await fetch('/api/projects', {
                  method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: targetProject.id, shortId: targetProject.shortId, projectName: mergedProjectName, data: { tasks: mergedTasks, lastSynced: syncNow } })
              });
              if (abortSignal.aborted) return;
              if (uploadRes.ok) {
                  const finalMergedProject = { ...targetProject, projectName: mergedProjectName, tasks: mergedTasks, role: fetchedRole, isPublic: mergedIsPublic, lastSynced: syncNow };
                  lastSyncedHashMap.current[targetProject.id] = await calculateHashAsync(finalMergedProject);
                  setProjects(prev => prev.map(p => p.id === targetProject.id ? finalMergedProject : p));
                  setSyncState('synced');
              } else if (uploadRes.status === 403) {
                  const errData = await uploadRes.json().catch(() => ({}));
                  setProjects(prev => prev.map(p => p.id === targetProject.id ? { ...p, role: errData.role || 'viewer' } : p));
                  setSyncState('error');
                  alert('権限が変更されたため、変更を保存できません。');
              } else { throw new Error("Failed to upload data"); }
          } else {
              const finalMergedProject = { ...targetProject, projectName: mergedProjectName, tasks: mergedTasks, role: fetchedRole, isPublic: mergedIsPublic, lastSynced: cloudProject?.data?.lastSynced || targetProject.lastSynced };
              lastSyncedHashMap.current[targetProject.id] = await calculateHashAsync(finalMergedProject);
              setProjects(prev => prev.map(p => p.id === targetProject.id ? finalMergedProject : p));
              setSyncState('synced');
          }
      } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          console.error('クラウド同期エラー', e);
          setSyncState('error');
      }
  }, [getToken, getWaitTime, setProjects, projectsRef, lastSyncedHashMap]);

  const activeProjectId = activeData?.id || '';
  const isCloudProject = activeData?.isCloudSync !== false && activeData?.role !== 'viewer';

  // タスク変更の監視トリガー（自動同期・プロジェクト切り替え）
  useEffect(() => {
    // 初回クラウド取得が未完了（isCloudLoadedがfalse）の場合は何もしない
    if (!isSignedIn || !activeProjectId || !isCloudLoaded) return;

    // ローカルプロジェクト（クラウド非対応）の場合は即座に同期状態を解除し処理を終了する
    if (activeProjectId.startsWith('local_') || !isCloudProject) {
      if (syncAbortControllerRef.current) syncAbortControllerRef.current.abort();
      setSyncState('idle');
      
      // 履歴を残すことで、次回クラウドプロジェクトに切り替えた際に「初回実行」と誤認されるのを防ぐ
      previousActiveIdRef.current = activeProjectId;
      if (currentHashInfo.id === activeProjectId) {
          previousHashRef.current = currentHashInfo.hash;
      }
      return;
    }

    if (currentHashInfo.id !== activeProjectId) return;

    // 初回実行であるかの判定（初回クラウドロード直後の不要な同期発火を防ぐため）
    const isFirstRun = previousActiveIdRef.current === '';
    const isProjectChanged = previousActiveIdRef.current !== activeProjectId;
    const isHashChanged = previousHashRef.current !== currentHashInfo.hash;

    if (!isProjectChanged && !isHashChanged) return;

    previousActiveIdRef.current = activeProjectId;
    previousHashRef.current = currentHashInfo.hash;
    
    // 初回クラウド取得が完了してIDがセットされた直後は、同期トリガーをスキップ
    if (isFirstRun) {
      setSyncState('synced');
      return;
    }

    // プロジェクト切り替え時（isProjectChanged = true）以外は、
    // ハッシュが一致していれば事前に即時キャンセル（待機状態やスピナーに入らない）
    if (!isProjectChanged && lastSyncedHashMap.current[activeProjectId] === currentHashInfo.hash) {
      if (syncAbortControllerRef.current) syncAbortControllerRef.current.abort();
      setSyncState(prev => (prev === 'waiting' || prev === 'syncing') ? 'synced' : prev);
      return;
    }

    if (syncAbortControllerRef.current) syncAbortControllerRef.current.abort();
    const abortController = new AbortController();
    syncAbortControllerRef.current = abortController;

    triggerSyncFlow(activeProjectId, isProjectChanged, abortController.signal);
    
    return () => { abortController.abort(); };
  }, [activeProjectId, currentHashInfo, isSignedIn, isCloudProject, isCloudLoaded, triggerSyncFlow, lastSyncedHashMap]);

  const resolveSyncLimit = async (selectedCloudIds: string[]) => {
    if (!syncLimitState) return;
    const token = await getToken();
    const unselected = syncLimitState.cloudProjects.filter(p => !selectedCloudIds.includes(p.id));
    for (const p of unselected) {
       try { await fetch(`/api/projects/${p.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); } catch (e) { console.error(e) }
    }
    const downgradedLocal: AppData[] = unselected.map((row: any) => ({
      id: generateProjectId(), projectName: row.projectName + ' (オフライン)', tasks: row.data.tasks || [],
      lastSynced: Date.now(), isCloudSync: false, role: 'owner'
    }));
    setProjects(prev => [...prev, ...downgradedLocal]);
    setSyncLimitState(null);
  };

  const uploadProject = async (localId: string) => {
    const target = projectsRef.current.find((p: AppData) => p.id === localId);
    if (!target) return;
    const cloudCount = projectsRef.current.filter((p: AppData) => !String(p.id).startsWith('local_') && p.isCloudSync !== false).length;
    if (cloudCount >= currentLimit) { alert(`プランのアップロード上限（${currentLimit}件）に達しています。`); return; }

    try {
      setSyncState('syncing');
      const token = await getToken();
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id, shortId: target.shortId, projectName: target.projectName, data: { tasks: target.tasks, lastSynced: target.lastSynced } })
      });
      if (res.ok) {
        const resData = await res.json();
        const finalProject = { ...target, id: resData.newId || target.id, shortId: resData.shortId || target.shortId, isCloudSync: true, role: 'owner' as const };
        lastSyncedHashMap.current[finalProject.id] = await calculateHashAsync(finalProject);
        setProjects(prev => prev.map(p => p.id === localId ? finalProject : p));
        if (activeId === localId && resData.newId) setActiveId(finalProject.id);
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

  const forceSync = useCallback(() => {
    if (!activeData || !isSignedIn || String(activeData.id).startsWith('local_') || activeData.isCloudSync === false) return;
    if (syncAbortControllerRef.current) syncAbortControllerRef.current.abort();
    const abortController = new AbortController();
    syncAbortControllerRef.current = abortController;
    
    // 手動同期時も forceFetch: true として待機時間を経てから確実にクラウドのデータを取得する
    triggerSyncFlow(activeData.id, true, abortController.signal);
  }, [activeData, isSignedIn, triggerSyncFlow]);

  return { syncState, syncLimitState, currentLimit, resolveSyncLimit, uploadProject, forceSync };
};