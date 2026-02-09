// src/types/index.ts
export interface Task {
  id: string;
  name: string;      
  status: 0 | 1 | 2 | 3; // 0:未着手, 1:進行中, 2:完了, 3:休止
  deadline?: number;
  lastUpdated: number; 
  parentId?: string;   
  isDeleted?: boolean;
  order?: number;
  sourceProjectName?: string;
}

export interface AppData {
  id: string;
  projectName: string; 
  tasks: Task[];
  lastSynced: number;
}