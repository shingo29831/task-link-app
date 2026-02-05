// src/utils/merge.ts
import type { AppData, Task } from '../types';

export const mergeAppData = (local: AppData, incoming: AppData): AppData => {
  // 追加: プロジェクト名が異なる場合はマージを拒否してローカルデータを返す
  if (local.projectName !== incoming.projectName) {
    console.warn('Project names do not match. Merge aborted.');
    return local;
  }

  const newerProjectStart = incoming.lastSynced > local.lastSynced ? incoming.projectStartDate : local.projectStartDate;
  const taskMap = new Map<string, Task>();
  
  local.tasks.forEach(t => taskMap.set(t.id, t));
  incoming.tasks.forEach(inc => {
    const loc = taskMap.get(inc.id);
    if (!loc || inc.lastUpdated > loc.lastUpdated) {
      taskMap.set(inc.id, inc);
    }
  });

  return { 
    projectName: local.projectName, // プロジェクト名を維持
    projectStartDate: newerProjectStart, 
    tasks: Array.from(taskMap.values()), 
    lastSynced: Date.now() 
  };
};