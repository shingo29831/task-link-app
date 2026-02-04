export interface Task {
  name: string;      // タスク名（ID兼任）
  status: 0 | 1 | 2; // 0:未着手, 1:進行中, 2:完了
  deadlineOffset?: number; // 開始日からの経過日数
  lastUpdated: number; // 更新日時 (Unix Time)
}

export interface AppData {
  projectStartDate: number; // Unix Time
  tasks: Task[];
  lastSynced: number;
}