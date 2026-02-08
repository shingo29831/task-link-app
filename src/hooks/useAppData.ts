import { useState, useEffect, useRef } from 'react';
import type { AppData } from '../types';
import { compressData, decompressData } from '../utils/compression';

const STORAGE_KEY = 'progress_app_v2';
const DEFAULT_START = 1577836800000; // 2020-01-01

// ID生成
const generateProjectId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

// デフォルトプロジェクト作成
const createDefaultProject = (): AppData => ({
  id: generateProjectId(),
  projectName: 'マイプロジェクト',
  projectStartDate: DEFAULT_START,
  tasks: [],
  lastSynced: Date.now()
});

export const useAppData = () => {
  const [projects, setProjects] = useState<AppData[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  
  // 現在のアクティブプロジェクト（UIで表示するもの）
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

      // デフォルトのアクティブID（通常は先頭）
      initialActiveId = loadedProjects[0].id;
      
      // URLからのロード処理
      const params = new URLSearchParams(window.location.search);
      const compressed = params.get('d');
      
      let newIncoming: AppData | null = null;
      let shouldAutoApply = false;

      if (compressed) {
        const incoming = decompressData(compressed);
        if (incoming) {
          incoming.id = generateProjectId();
          newIncoming = incoming;
          
          // 1. 同じ名前のプロジェクトがあるか検索
          const sameNameProject = loadedProjects.find(p => p.projectName === incoming.projectName);

          if (sameNameProject) {
            // 同じ名前がある場合: そのプロジェクトを対象にしてマージ（アクティブIDを切り替え）
            initialActiveId = sameNameProject.id;
            // マージモーダルを表示するためにセット
            // (名前が一致しているため、モーダルはタスク比較から始まります)
          } else {
            // 同じ名前がない場合: 現在の対象（initialActiveId）を確認
            const currentTarget = loadedProjects.find(p => p.id === initialActiveId);
            const hasActiveTasks = currentTarget && currentTarget.tasks.some(t => !t.isDeleted);

            if (!hasActiveTasks) {
              // 空なら自動適用（上書き）
              shouldAutoApply = true;
            } 
            // タスクがある場合は自動適用せず、下流の処理でincomingDataをセット -> MergeModal表示
            // MergeModalで「プロジェクト名不一致」が表示され、そこで「新規作成」を選べるようになる
          }
        }
      }

      if (shouldAutoApply && newIncoming) {
        loadedProjects = loadedProjects.map(p => 
            p.id === initialActiveId ? newIncoming! : p
        );
        initialActiveId = newIncoming.id;
        window.history.replaceState(null, '', window.location.pathname);
      } else if (newIncoming) {
        setIncomingData(newIncoming);
        window.history.replaceState(null, '', window.location.pathname);
      }

      setProjects(loadedProjects);
      setActiveId(initialActiveId);
    };
    load();
  }, []);

  // 2. データの変更をLocalStorageに保存
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }
  }, [projects]);

  // 3. アクティブプロジェクトの変更をURLに反映
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
    const count = projects.filter(p => p.projectName.startsWith('マイプロジェクト')).length;
    if (count > 0) {
        newProject.projectName = `マイプロジェクト ${count + 1}`;
    }
    setProjects(prev => [...prev, newProject]);
    setActiveId(newProject.id);
  };

  // インポートデータを新規プロジェクトとして追加する関数
  const importNewProject = (data: AppData) => {
    // 名前重複回避（念のため）
    let name = data.projectName;
    let suffix = 1;
    // 完全に同名のプロジェクトが既に存在する場合のみサフィックスをつける
    while(projects.some(p => p.projectName === name)) {
       name = `${data.projectName} (${suffix++})`;
    }
    
    const newProject = { ...data, id: generateProjectId(), projectName: name };
    setProjects(prev => [...prev, newProject]);
    setActiveId(newProject.id);
    setIncomingData(null); // モーダルを閉じる
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
    importNewProject, // 追加
    switchProject,
    deleteProject
  };
};