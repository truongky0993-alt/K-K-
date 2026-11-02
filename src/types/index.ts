export type TaskCategory = 'Routine' | 'Planned' | 'Ad-hoc';
export type TimeSlot = 'Morning' | 'Afternoon' | 'Evening' | 'Inbox';
export type Priority = 'High' | 'Normal' | 'Low';

export interface Task {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD in Asia/Ho_Chi_Minh
  status: boolean; // true = done
  category: TaskCategory;
  timeSlot: TimeSlot;
  priority: Priority;
  createdAt?: string;
  isTemp?: boolean;
}

export interface DayProgress {
  total: number;
  completed: number;
  percentage: number;
}
