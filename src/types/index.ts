export interface Task {
  id: string;        // 36進数のID
  name: string;      
  status: 0 | 1 | 2 | 3; // 0:未着手, 1:進行中, 2:完了, 3:休止
  deadlineOffset?: number; 
  lastUpdated: number; 
  parentId?: string;   
  isDeleted?: boolean;
}

export interface AppData {
  projectStartDate: number; 
  tasks: Task[];
  lastSynced: number;
}