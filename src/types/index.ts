export interface Task {
  id: string;        // 36進数のID
  name: string;      
  status: 0 | 1 | 2; 
  deadlineOffset?: number; 
  lastUpdated: number; 
  parentId?: string;   // 親タスクの36進数ID
}

export interface AppData {
  projectStartDate: number; 
  tasks: Task[];
  lastSynced: number;
}