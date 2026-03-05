// 役割: プロジェクトやタスクに依存しない純粋な関数・ユーティリティ（ID生成やハッシュ計算）
import type { AppData, Task } from '../types';

export const generateProjectId = () => 'local_' + crypto.randomUUID();

export const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const createDefaultProject = (): AppData => ({
  id: generateProjectId(),
  projectName: 'マイプロジェクト',
  tasks: [],
  lastSynced: Date.now(),
  isCloudSync: false,
  role: 'owner'
});

export const isEffectivelyIdentical = (local: AppData, incoming: AppData) => {
  const localActive = local.tasks.filter((t: Task) => !t.isDeleted);
  const incomingActive = incoming.tasks.filter((t: Task) => !t.isDeleted);

  if (localActive.length !== incomingActive.length) return false;

  const normalizeTask = (t: Task) => {
      const name = String(t.name || '').trim();
      const status = Number(t.status || 0);
      let d = 0;
      if (t.deadline) {
          const date = new Date(t.deadline);
          date.setHours(0, 0, 0, 0);
          d = date.getTime();
      }
      return `${name}|${status}|${d}`;
  };

  const localSigs = localActive.map(normalizeTask).sort();
  const incomingSigs = incomingActive.map(normalizeTask).sort();

  return localSigs.join('::') === incomingSigs.join('::');
};

export const calculateHash = (project: AppData & { includeDataInLink?: boolean }): number => {
  const essentialTasks = project.tasks.map((t: Task) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    parentId: t.parentId,
    deadline: t.deadline,
    isDeleted: t.isDeleted,
    order: t.order
  }));
  const membersStr = project.members ? JSON.stringify(project.members) : '';
  const str = project.projectName + JSON.stringify(essentialTasks) + String(project.isPublic) + membersStr + String(project.includeDataInLink);
  
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0;
};

// UIスレッドをブロックしないように非同期でハッシュ計算を行う
export const calculateHashAsync = (project: AppData): Promise<number> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(calculateHash(project));
    }, 0);
  });
};