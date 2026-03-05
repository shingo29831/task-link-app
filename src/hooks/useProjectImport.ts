// 役割: JSONファイルやURLパラメータからのプロジェクトデータ復元・インポートを管理する
// なぜ: 非同期通信やマージのロジックが長く、メインの操作フックを肥大化させているため

import { useState, useCallback, useMemo } from 'react';
import type { AppData, Task } from '../types';
import { decompressData } from '../utils/compression';

export const useProjectImport = (
  data: AppData | null,
  projectsRef: React.MutableRefObject<AppData[]>,
  activeId: string,
  addOrUpdateProject: (p: AppData) => void,
  switchProject: (id: string) => void,
  deleteProject: (id: string, cloud: boolean) => void,
  setIncomingData: (d: AppData | null) => void,
  incomingData: AppData | null,
  getToken: () => Promise<string | null>
) => {

  const [importCloudCheck, setImportCloudCheck] = useState<{ isOpen: boolean; incoming: any; projectData: any; } | null>(null);

  const targetLocalData = useMemo(() => {
    if (!incomingData || !projectsRef.current || !data) return null;
    const sameNameProject = projectsRef.current.find((p: AppData) => p.projectName === incomingData.projectName);
    if (sameNameProject) return sameNameProject;
    const sameIdProject = projectsRef.current.find((p: AppData) => p.id === incomingData.id);
    if (sameIdProject) return sameIdProject;
    return data;
  }, [incomingData, projectsRef, data]);

  const finalizeImport = useCallback((incoming: any) => {
    const currentProjects = projectsRef.current;
    const sameIdProject = currentProjects.find((p: AppData) => p.id === incoming.id);
    
    if (sameIdProject) {
       if (JSON.stringify(sameIdProject.tasks || []) === JSON.stringify(incoming.tasks || []) && sameIdProject.projectName === incoming.projectName) {
           alert('インポートされたデータは現在のプロジェクトと完全に一致しています。');
           if (activeId !== incoming.id) switchProject(incoming.id);
           return;
       }
       setIncomingData(incoming); 
       return;
    }

    const sameNameProject = currentProjects.find((p: AppData) => p.projectName === incoming.projectName);
    if (sameNameProject) {
       if ((sameNameProject.tasks || []).every((t: Task) => t.isDeleted)) {
           deleteProject(sameNameProject.id, false);
       } else {
           setIncomingData(incoming); 
           return;
       }
    }

    addOrUpdateProject({ ...incoming, lastSynced: Date.now() });
    if (activeId !== incoming.id) switchProject(incoming.id);
    
    if (data && (data.tasks || []).every((t: Task) => t.isDeleted) && data.id !== incoming.id && data.projectName === '名称未設定プロジェクト') {
        deleteProject(data.id, false);
    }
    alert(`プロジェクト名：${incoming.projectName} を読み込みました。`);
  }, [activeId, data, setIncomingData, addOrUpdateProject, switchProject, deleteProject, projectsRef]);

  const handleCloudImportChoice = useCallback((useCloud: boolean) => {
      if (!importCloudCheck) return;
      const { incoming, projectData } = importCloudCheck;
      
      if (useCloud) {
          let cloudAppObj: AppData = {
              ...(typeof projectData.data === 'string' ? JSON.parse(projectData.data) : projectData.data),
              id: projectData.id, shortId: projectData.shortId, projectName: projectData.projectName,
              isCloudSync: true, role: projectData.role, isPublic: projectData.isPublic,
              publicRole: projectData.publicRole, members: projectData.members || []
          };
          finalizeImport(cloudAppObj);
      } else {
          incoming.isCloudSync = true;
          incoming.role = projectData.role;
          incoming.members = projectData.members;
          incoming.isPublic = projectData.isPublic;
          incoming.publicRole = projectData.publicRole;
          incoming.shortId = projectData.shortId || incoming.shortId;
          if(!incoming.tasks) incoming.tasks = []; 
          finalizeImport(incoming);
      }
      setImportCloudCheck(null);
  }, [importCloudCheck, finalizeImport]);

  const processImportedData = useCallback(async (incoming: any) => {
    if (!incoming.tasks) incoming.tasks = [];

    let isCloudId = incoming.id && !String(incoming.id).startsWith('local_');
    let treatAsLocal = false;

    if (isCloudId) {
      try {
        const token = await getToken();
        const res = await fetch(`/api/projects/${incoming.id}`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
        
        if (res.ok) {
          const resData = await res.json();
          const projectData = resData.project || resData;
          projectData.isCloudSync = true;
          if (resData.role) projectData.role = resData.role;
          
          try {
              const membersRes = await fetch(`/api/projects/${incoming.id}/members`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
              if (membersRes.ok) {
                  const membersData = await membersRes.json();
                  projectData.members = membersData.members;
                  projectData.isPublic = membersData.isPublic;
                  projectData.publicRole = membersData.publicRole;
              }
          } catch (e) { console.error(e); }
          
          setImportCloudCheck({ isOpen: true, incoming, projectData });
          return; 
        } else {
          if (res.status === 401 || res.status === 403) alert('クラウドプロジェクトのアクセス権限がありません。\nローカルプロジェクトとして読み込みます。');
          treatAsLocal = true;
        }
      } catch (e) { treatAsLocal = true; }
    }

    if (treatAsLocal) {
      incoming.isCloudSync = false;
      incoming.shortId = undefined;
      incoming.role = 'owner';
      if (!String(incoming.id).startsWith('local_')) incoming.id = 'local_' + incoming.id;
    }
    finalizeImport(incoming);
  }, [getToken, finalizeImport]);
  
  const handleImportFromUrl = useCallback(async (urlStr: string) => {
    try {
      const targetUrl = urlStr.startsWith('http') ? urlStr : `${window.location.origin}${urlStr.startsWith('/') ? '' : '/'}${urlStr}`;
      const url = new URL(targetUrl);
      const compressed = url.searchParams.get('d');
      if (!compressed) { alert('URLに有効なデータが含まれていません。'); return; }
      const incoming = decompressData(compressed);
      if (incoming) {
        if (!incoming.tasks) incoming.tasks = [];
        if (data && JSON.stringify(incoming.tasks) === JSON.stringify(data.tasks) && incoming.projectName === data.projectName) { 
          alert('インポートされたデータは現在のプロジェクトと完全に一致しています。'); return; 
        }
        await processImportedData(incoming);
      } else { alert('データの復元に失敗しました。'); }
    } catch (e) { alert('URLの形式が正しくありません。'); }
  }, [data, processImportedData]);

  const handleFileImport = useCallback((f: File) => {
      const r = new FileReader();
      r.onload = async (e) => {
        try {
          const incoming = JSON.parse(e.target?.result as string);
          await processImportedData(incoming);
        } catch(err) { alert('JSONの読み込みに失敗しました'); }
      };
      r.readAsText(f);
  }, [processImportedData]);

  return { targetLocalData, importCloudCheck, handleCloudImportChoice, handleImportFromUrl, handleFileImport };
};