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

export interface RoutineTemplate {
  id: string;
  name: string;
  timeSlot: TimeSlot;
  priority: Priority;
  active: boolean;
  days: string[]; // T2, T3, T4, T5, T6, T7, CN (rỗng = mọi ngày)
}

export interface DayProgress {
  total: number;
  completed: number;
  percentage: number;
}

export type MoodType = '🌟 Xuất sắc' | '😊 Hài lòng' | '😐 Bình thường' | '⚠️ Cần cố gắng';

export interface DailyJournal {
  id?: string;
  date: string; // YYYY-MM-DD
  mood: MoodType;
  learned: string; // Học được gì
  unfinished: string; // Chưa học gì / Tồn đọng
  obstacles: string; // Thiếu sót & Trở ngại
  actionPlan: string; // Kế hoạch sửa đổi ngày mai
  aiFeedback?: string; // AI đánh giá / Phản hồi tuần
  createdAt?: string;
  updatedAt?: string;
}
