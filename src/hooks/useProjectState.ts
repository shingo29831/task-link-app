// 役割: プロジェクト一覧の保持、アクティブプロジェクトの切り替え、Undo/Redoなどローカル状態の管理

import { useState, useCallback, useRef, useEffect } from 'react';
import { useHistory } from './useHistory';
import type { AppData } from '../types';
import { generateProjectId, createDefaultProject } from '../utils/projectUtils';

export const useProjectState = () => {
  const { state: projects, setState: setProjects, resetState: resetProjects, undo: baseUndo, redo: baseRedo, canUndo, canRedo } = useHistory<AppData[]>([]);
  const projectsRef = useRef<AppData[]>(projects);
  useEffect(() => { projectsRef.current = projects; }, [projects]);

  const [activeId, setActiveId] = useState<string>('');
  const activeData = projects.find((p: AppData) => p.id === activeId) || null;
  const [incomingData, setIncomingData] = useState<AppData | null>(null);

  const undo = useCallback(() => { baseUndo(); }, [baseUndo]);
  const redo = useCallback(() => { baseRedo(); }, [baseRedo]);

  const addOrUpdateProject = useCallback((newData: AppData) => {
    setProjects(prev => prev.some(p => p.id === newData.id) ? prev.map(p => p.id === newData.id ? newData : p) : [...prev, newData]);
    setActiveId(newData.id);
  }, [setProjects]);

  // ★ setActiveData から setData に名前を変更
  const setData = useCallback((newData: AppData) => { 
    setProjects(prev => prev.map(p => p.id === newData.id ? newData : p)); 
  }, [setProjects]);
  
  const updateProject = useCallback((updatedProject: AppData) => { 
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p)); 
  }, [setProjects]);

  const addProject = useCallback(() => {
    const newProject = createDefaultProject();
    let nameCandidate = 'マイプロジェクト', counter = 1;
    while (projectsRef.current.some((p: AppData) => p.projectName === nameCandidate)) nameCandidate = `マイプロジェクト ${++counter}`;
    newProject.projectName = nameCandidate;
    setProjects(prev => [...prev, newProject]);
    setActiveId(newProject.id);
  }, [setProjects]);

  const importNewProject = useCallback((data: AppData) => {
    let name = data.projectName, suffix = 1;
    while(projectsRef.current.some((p: AppData) => p.projectName === name)) name = `${data.projectName} (${suffix++})`;
    const newProject = { ...data, id: generateProjectId(), projectName: name };
    setProjects(prev => [...prev, newProject]);
    setActiveId(newProject.id);
    setIncomingData(null);
  }, [setProjects]);

  const switchProject = useCallback((id: string) => { 
    setActiveId(id);
  }, []);

  return {
    projects, setProjects, resetProjects, projectsRef,
    activeId, setActiveId, activeData,
    incomingData, setIncomingData,
    undo, redo, canUndo, canRedo,
    addOrUpdateProject, setData, updateProject, addProject, importNewProject, switchProject // ★ setData に変更
  };
};