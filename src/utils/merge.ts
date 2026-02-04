import type { AppData, Task } from '../types';

export const mergeAppData = (local: AppData, incoming: AppData): AppData => {
  const newerProjectStart = 
    incoming.lastSynced > local.lastSynced ? incoming.projectStartDate : local.projectStartDate;

  const taskMap = new Map<string, Task>();

  // ローカルを展開 (キーをIDに変更)
  local.tasks.forEach(t => taskMap.set(t.id, t));

  // 外部データを上書き (IDで照合)
  incoming.tasks.forEach(incTask => {
    const locTask = taskMap.get(incTask.id);
    if (!locTask || incTask.lastUpdated > locTask.lastUpdated) {
      taskMap.set(incTask.id, incTask);
    }
  });

  return {
    projectStartDate: newerProjectStart,
    tasks: Array.from(taskMap.values()),
    lastSynced: Date.now()
  };
};