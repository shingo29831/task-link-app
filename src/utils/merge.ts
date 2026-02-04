import type { AppData, Task } from '../types';

export const mergeAppData = (local: AppData, incoming: AppData): AppData => {
  // プロジェクト開始日は新しい方を採用（要件に合わせて調整）
  const newerProjectStart = 
    incoming.lastSynced > local.lastSynced ? incoming.projectStartDate : local.projectStartDate;

  const taskMap = new Map<string, Task>();

  // ローカルを展開
  local.tasks.forEach(t => taskMap.set(t.name, t));

  // 外部データを上書き (Last Write Wins)
  incoming.tasks.forEach(incTask => {
    const locTask = taskMap.get(incTask.name);
    if (!locTask || incTask.lastUpdated > locTask.lastUpdated) {
      taskMap.set(incTask.name, incTask);
    }
  });

  return {
    projectStartDate: newerProjectStart,
    tasks: Array.from(taskMap.values()),
    lastSynced: Date.now()
  };
};