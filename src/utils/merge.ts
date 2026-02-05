// src/utils/merge.ts
import type { AppData, Task } from '../types';

// 初期状態のプロジェクト名を定義（useAppData.tsのデフォルト値と合わせる）
const DEFAULT_PROJECT_NAME = 'マイプロジェクト';

export const mergeAppData = (local: AppData, incoming: AppData): AppData => {
  // 条件: プロジェクト名が異なり、かつローカルが初期名ではない場合のみマージを拒否
  // つまり、ローカルが「マイプロジェクト」なら、incomingの名称を上書き許可する
  if (local.projectName !== incoming.projectName && local.projectName !== DEFAULT_PROJECT_NAME) {
    console.warn('Project names do not match. Merge aborted.');
    return local;
  }

  // プロジェクト名は、ローカルがデフォルトなら受信データを、そうでなければローカルを優先
  const finalProjectName = local.projectName === DEFAULT_PROJECT_NAME ? incoming.projectName : local.projectName;

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
    projectName: finalProjectName, 
    projectStartDate: newerProjectStart, 
    tasks: Array.from(taskMap.values()), 
    lastSynced: Date.now() 
  };
};