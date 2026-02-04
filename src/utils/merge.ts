import type { AppData, Task } from '../types';

export const mergeAppData = (local: AppData, incoming: AppData): AppData => {
  const newerProjectStart = incoming.lastSynced > local.lastSynced ? incoming.projectStartDate : local.projectStartDate;
  const taskMap = new Map<string, Task>();
  local.tasks.forEach(t => taskMap.set(t.id, t));
  incoming.tasks.forEach(inc => {
    const loc = taskMap.get(inc.id);
    if (!loc || inc.lastUpdated > loc.lastUpdated) taskMap.set(inc.id, inc);
  });
  return { projectStartDate: newerProjectStart, tasks: Array.from(taskMap.values()), lastSynced: Date.now() };
};