// 役割: 生のタスクデータからUI表示に必要なツリー構造、進捗率、カレンダー用データなどを計算する
// なぜ: メモ化（useMemo）のロジックを集約し、レンダリングパフォーマンスの最適化を明確にするため

import { useMemo } from 'react';
import type { Task, AppData } from '../types';
import { getIntermediateJson, from185 } from '../utils/compression';
import { MAPPING_GROUPS_V0 as MAPPING_GROUPS } from '../utils/versions/v0';

type TaskNode = Task & { children: TaskNode[] };

export const useTaskView = (data: AppData | null, projects: AppData[], showAllProjectsInCalendar: boolean) => {
  const activeTasks = useMemo(() => {
    return data ? (data.tasks || []).filter((t: Task) => !t.isDeleted) : [];
  }, [data]);

  const calendarTasks = useMemo(() => {
    if (!data) return [];
    if (!showAllProjectsInCalendar) {
      return activeTasks.map((t: Task) => ({
          ...t,
          hasChildren: activeTasks.some((child: Task) => !child.isDeleted && child.parentId === t.id)
      }));
    }

    const allTasks: Task[] = [];
    projects.forEach((proj: AppData) => {
      const projTasks = (proj.tasks || []).filter((t: Task) => !t.isDeleted);
      const isCurrentProject = proj.id === data.id;

      const safeTasks = projTasks.map((t: Task) => {
          const hasChildren = projTasks.some((child: Task) => !child.isDeleted && child.parentId === t.id);
          return {
            ...t,
            id: isCurrentProject ? t.id : `${proj.id}_${t.id}`,
            sourceProjectName: isCurrentProject ? undefined : proj.projectName,
            sourceProjectId: isCurrentProject ? undefined : proj.id,
            hasChildren
          };
      });
      allTasks.push(...safeTasks);
    });

    return allTasks;
  }, [data, projects, activeTasks, showAllProjectsInCalendar]);

  const rootNodes = useMemo(() => {
    if (!data) return [];
    const buildTree = (tasks: Task[]): TaskNode[] => {
      const map = new Map<string, TaskNode>();
      tasks.filter(t => !t.isDeleted).forEach(t => map.set(t.id, { ...t, children: [] }));
      const roots: TaskNode[] = [];
      tasks.filter(t => !t.isDeleted).forEach(t => {
        const node = map.get(t.id)!;
        if (t.parentId && map.has(t.parentId)) map.get(t.parentId)!.children.push(node);
        else roots.push(node);
      });
      const sortFn = (a: TaskNode, b: TaskNode) => (a.order ?? 0) - (b.order ?? 0);
      map.forEach(node => node.children.sort(sortFn));
      roots.sort(sortFn);
      return roots;
    };
    return buildTree(data.tasks || []);
  }, [data]);

  const projectProgress = useMemo(() => {
    if (!data || activeTasks.length === 0) return 0;
    const parentIds = new Set(activeTasks.map((t: Task) => t.parentId).filter(Boolean));
    const leafTasks = activeTasks.filter((t: Task) => !parentIds.has(t.id));
    let total = 0, count = 0;
    leafTasks.forEach((t: Task) => {
      total += t.status === 2 ? 100 : t.status === 1 ? 50 : 0;
      count++;
    });
    if (count === 0) return 0;
    return Math.round(total / count);
  }, [data, activeTasks]);

  const debugInfo = useMemo(() => {
    if (!data) return { normal: "", intermediate: "", compressed: "", normalLen: 0, intermediateLen: 0, compressedLen: 0, rate: 0, mappingInfo: "" };
    const normal = JSON.stringify(data);
    const intermediate = getIntermediateJson(data);
    let mappingInfo = "Unknown";
    try {
      const headerPart = intermediate.split('[')[0]; 
      const parts = headerPart.split(',');
      if (parts.length >= 2) {
        const ver = from185(parts[0]);
        if (ver === 0) {
          const groupId = from185(parts[1]);
          const group = MAPPING_GROUPS[groupId];
          if (group) mappingInfo = `[ID:${groupId}] ${group.name}`;
          else mappingInfo = `ID:${groupId} (Undefined)`;
        }
      }
    } catch (e) { console.error("Failed to parse mapping group", e); }
    const compressed = intermediate; 
    const rate = normal.length > 0 ? (compressed.length / normal.length) * 100 : 0;
    return { normal, intermediate, compressed, normalLen: normal.length, intermediateLen: intermediate.length, compressedLen: compressed.length, rate, mappingInfo };
  }, [data]);

  return { activeTasks, calendarTasks, rootNodes, projectProgress, debugInfo };
};