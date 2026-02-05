// src/utils/merge.ts
import type { AppData, Task } from '../types';

// 初期状態のプロジェクト名を定義（useAppData.tsのデフォルト値と合わせる）
const DEFAULT_PROJECT_NAME = 'マイプロジェクト';

// ID生成用ヘルパー (exportを追加)
export const generateNewId = (tasks: {id: string}[]): string => {
  let maxIdVal = 0;
  tasks.forEach(t => {
    const v = parseInt(t.id, 36);
    if (!isNaN(v) && v > maxIdVal) maxIdVal = v;
  });
  return (maxIdVal + 1).toString(36);
};

export const mergeAppData = (local: AppData, incoming: AppData): AppData => {
  // 条件: プロジェクト名が異なり、かつローカルが初期名ではない場合のみマージを拒否
  if (local.projectName !== incoming.projectName && local.projectName !== DEFAULT_PROJECT_NAME) {
    console.warn('Project names do not match. Merge aborted.');
    return local;
  }

  // プロジェクト名は、ローカルがデフォルトなら受信データを、そうでなければローカルを優先
  const finalProjectName = local.projectName === DEFAULT_PROJECT_NAME ? incoming.projectName : local.projectName;
  const newerProjectStart = incoming.lastSynced > local.lastSynced ? incoming.projectStartDate : local.projectStartDate;
  
  // 1. 新しいIDを生成するための準備
  // ローカルの最大ID値を取得
  let maxIdVal = 0;
  local.tasks.forEach(t => {
    const v = parseInt(t.id, 36);
    if (!isNaN(v) && v > maxIdVal) maxIdVal = v;
  });
  
  const generateId = () => {
    maxIdVal++;
    return maxIdVal.toString(36);
  };

  // 2. マッピングの準備
  const localTasksByName = new Map<string, Task>();
  // 削除済みタスクも含めて名前で検索できるようにする（同名なら同じタスクとみなすため）
  local.tasks.forEach(t => localTasksByName.set(t.name, t));

  const localTasksById = new Map<string, Task>();
  local.tasks.forEach(t => localTasksById.set(t.id, t));

  const resultTasksMap = new Map<string, Task>();
  local.tasks.forEach(t => resultTasksMap.set(t.id, t));

  // incomingのIDがローカルのどのIDにマッピングされたか（または新しく生成されたか）を保持
  const incomingIdMap = new Map<string, string>();

  // 3. IncomingタスクのID決定とマージ判定
  incoming.tasks.forEach(inc => {
    const sameNameLocal = localTasksByName.get(inc.name);

    if (sameNameLocal) {
      // 名前が一致する場合：同じタスクとみなしてマージ
      // マッピング：incomingのID -> ローカルの既存ID
      incomingIdMap.set(inc.id, sameNameLocal.id);
      
      // 更新判定（incomingの方が新しければ上書き）
      if (inc.lastUpdated > sameNameLocal.lastUpdated) {
        // IDはローカルのものを維持
        resultTasksMap.set(sameNameLocal.id, { ...inc, id: sameNameLocal.id });
      }
    } else {
      // 名前が一致しない場合：新規タスクとして追加（両方残す）
      // URL側（incoming）のIDを変更して追加する
      const newId = generateId();
      incomingIdMap.set(inc.id, newId);
      
      // 新しいIDで登録（parentIdの解決は後で行うため、一旦そのまま）
      resultTasksMap.set(newId, { ...inc, id: newId });
    }
  });

  // 4. 親子関係の修復
  // resultTasksMapの中にあるタスクのうち、incoming由来のものはparentIdが古いincoming IDを指している可能性がある
  // incomingIdMapを使って正しいID（ローカルIDまたは新規生成ID）に付け替える
  incoming.tasks.forEach(inc => {
    const targetId = incomingIdMap.get(inc.id);
    if (!targetId) return;

    const taskInResult = resultTasksMap.get(targetId);
    if (!taskInResult) return;

    // このタスクがincomingのデータで上書き/追加されている場合のみparentIdの修正が必要
    // (localの方が新しくて上書きされなかった場合は修正不要)
    const originalLocal = localTasksById.get(targetId);
    const isOverwrittenOrNew = !originalLocal || inc.lastUpdated > originalLocal.lastUpdated;

    if (isOverwrittenOrNew && inc.parentId) {
      const newParentId = incomingIdMap.get(inc.parentId);
      if (newParentId) {
        taskInResult.parentId = newParentId;
      } else {
        // 親がincoming内に存在しない（削除されたか、範囲外）場合はリンクを切る
        taskInResult.parentId = undefined;
      }
    }
  });

  return { 
    projectName: finalProjectName, 
    projectStartDate: newerProjectStart, 
    tasks: Array.from(resultTasksMap.values()), 
    lastSynced: Date.now() 
  };
};