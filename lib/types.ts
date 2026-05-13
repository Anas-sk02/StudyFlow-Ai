export type Priority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Profile {
  id: string;
  full_name: string;
  university: string | null;
  branch: string | null;
  year: string | null;
  bio: string | null;
  avatar_url: string | null;
  daily_target_hours: number;
  study_streak: number;
  goals: string[];
  timezone: string;
}

export interface StudyTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  subject: string;
  deadline: string | null;
  due_time: string | null;
  priority: Priority;
  status: TaskStatus;
  estimated_hours: number;
  reminder_sent: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface StudyRoom {
  id: string;
  name: string;
  topic: string;
  created_by: string;
  created_at: string;
}
