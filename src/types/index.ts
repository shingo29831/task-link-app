export interface Task {
  id: string;        // 36進数のID（実行時にインデックスから生成）
  name: string;      
  status: 0 | 1 | 2; 
  deadlineOffset?: number; 
  lastUpdated: number; 
  parentId?: string;   
  isDeleted?: boolean; // ★ 追加: 削除済みスロットを識別
}

export interface AppData {
  projectStartDate: number; 
  tasks: Task[];
  lastSynced: number;
}