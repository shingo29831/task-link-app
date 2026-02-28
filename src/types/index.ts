export interface Task {
  id: string;
  name: string;
  status: 0 | 1 | 2 | 3;
  deadline?: number;
  lastUpdated: number;
  parentId?: string;
  order?: number;
  isDeleted?: boolean;
}

export type UserRole = 'viewer' | 'editor' | 'admin' | 'owner';

export interface ProjectMember {
  id: string; // userId
  username: string;
  role: UserRole;
}

export interface AppData {
  id: string;
  shortId?: string;
  projectName: string;
  tasks: Task[];
  lastSynced: number;
  isPublic?: boolean;
  publicRole?: UserRole;
  members?: ProjectMember[];
  isCloudSync?: boolean; 
  role?: UserRole | string; // ★ 追加: 現在のユーザーのこのプロジェクトに対する権限
}