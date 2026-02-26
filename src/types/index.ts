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

export interface AppData {
  id: string;
  shortId?: string;
  projectName: string;
  tasks: Task[];
  lastSynced: number;
}