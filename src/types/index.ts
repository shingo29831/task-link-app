// src/types/index.ts
// 役割: アプリケーション全体で利用する共通の型定義
// なぜ: 各コンポーネント間でデータの整合性を保つため

export interface Task {
  id: string;
  name: string;
  status: 0 | 1 | 2 | 3;
  deadline?: number;
  lastUpdated: number;
  parentId?: string;
  order?: number;
  isDeleted?: boolean;
  
  isExpanded?: boolean;

  hasChildren?: boolean;
  sourceProjectName?: string;
  sourceProjectId?: string;
}

export type UserRole = 'viewer' | 'editor' | 'admin' | 'owner';

export interface ProjectMember {
  id: string;
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
  role?: UserRole | string;
  isSnapshot?: boolean; 
  includeDataInLink?: boolean; // なぜ: リンクにデータを含める設定の状態を型安全に管理するため
}

export interface UserSettings {
  language: string;
  timezone: string;
  theme: string;
  weekStartsOn: number;
  boardLayout?: 'horizontal' | 'vertical'; 
  customBoardLayout?: boolean;
  boardLayoutDesktop?: 'horizontal' | 'vertical';
  boardLayoutTablet?: 'horizontal' | 'vertical';
  boardLayoutMobile?: 'horizontal' | 'vertical';
  lastUpdated?: number;
}