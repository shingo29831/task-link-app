// src/types/index.ts
export interface Task {
  id: string;
  name: string;      
  status: 0 | 1 | 2 | 3; // 0:未着手, 1:進行中, 2:完了, 3:休止
  deadline?: number; // 変更: 期限日 (Unix Timestamp ms, 00:00:00)
  lastUpdated: number; 
  parentId?: string;   
  isDeleted?: boolean;
  order?: number;
}

export interface AppData {
  id: string;
  projectName: string; 
  // projectStartDate を削除
  tasks: Task[];
  lastSynced: number;
}