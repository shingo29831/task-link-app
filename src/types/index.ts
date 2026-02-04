export interface Task {
  id: string;        // 36進数のID（配列のインデックスから生成）
  name: string;      
  status: 0 | 1 | 2; 
  deadlineOffset?: number; 
  lastUpdated: number; 
  parentId?: string;   
  isDeleted?: boolean; // 削除済みスロット（順序維持用）
}

export interface AppData {
  projectStartDate: number; 
  tasks: Task[];
  lastSynced: number;
}