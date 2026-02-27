import type { Task } from '../types';

export const recalculateStatus = (tasks: Task[]): Task[] => {
  const next = [...tasks];
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < next.length; i++) {
      if (next[i].isDeleted) continue;
      const children = next.filter(t => !t.isDeleted && t.parentId === next[i].id);
      
      if (children.length > 0) {
        let newStatus: 0 | 1 | 2 | 3 = 0;

        const allCompleted = children.every(c => c.status === 2);
        const hasSuspended = children.some(c => c.status === 3);
        const hasInProgress = children.some(c => c.status === 1);
        
        const onlySuspendedAndCompleted = children.every(c => c.status === 3 || c.status === 2);

        if (allCompleted) {
            newStatus = 2;
        } else if (hasSuspended && onlySuspendedAndCompleted) {
            newStatus = 3;
        } else if (hasInProgress) {
            newStatus = 1;
        } else {
            newStatus = 0;
        }

        if (next[i].status !== newStatus) {
          next[i] = { ...next[i], status: newStatus, lastUpdated: Date.now() };
          changed = true;
        }
      }
    }
  }
  return next;
};