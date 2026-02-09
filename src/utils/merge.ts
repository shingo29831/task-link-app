// src/utils/merge.ts
import type { AppData, Task } from '../types';

// 初期状態のプロジェクト名を定義
const DEFAULT_PROJECT_NAME = 'マイプロジェクト';

export const mergeAppData = (local: AppData, incoming: AppData): AppData => {
  // 条件: プロジェクト名が異なり、かつローカルが初期名ではない場合のみマージを拒否
  if (local.projectName !== incoming.projectName && local.projectName !== DEFAULT_PROJECT_NAME) {
    console.warn('Project names do not match. Merge aborted.');
    return local;
  }

  // プロジェクト名は、ローカルがデフォルトなら受信データを、そうでなければローカルを優先
  const finalProjectName = local.projectName === DEFAULT_PROJECT_NAME ? incoming.projectName : local.projectName;
  
  // 1. マップの準備
  const localTasksById = new Map<string, Task>();
  local.tasks.forEach(t => localTasksById.set(t.id, t));

  const resultTasksMap = new Map<string, Task>();
  // まずローカルのタスクを全て候補に入れる
  local.tasks.forEach(t => resultTasksMap.set(t.id, t));

  // 2. Incomingタスクのマージ (IDベース)
  incoming.tasks.forEach(inc => {
    const existingLocal = localTasksById.get(inc.id);

    if (existingLocal) {
      // IDが一致する場合：更新日時が新しい方を採用
      if (inc.lastUpdated > existingLocal.lastUpdated) {
        resultTasksMap.set(inc.id, inc);
      }
    } else {
      // IDが一致しない場合：新規追加
      resultTasksMap.set(inc.id, inc);
    }
  });

  // 3. 親子関係の整合性チェック
  const finalTasks = Array.from(resultTasksMap.values()).map(task => {
      if (task.parentId && !resultTasksMap.has(task.parentId)) {
          return { ...task, parentId: undefined };
      }
      return task;
  });

  return { 
    id: local.id, 
    projectName: finalProjectName, 
    tasks: finalTasks, 
    lastSynced: Date.now() 
  };
};