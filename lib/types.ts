export type Priority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";

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
  recurrence: Recurrence;
  reminder_sent: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  done: boolean;
  position: number;
  created_at: string;
}

export interface StudyRoom {
  id: string;
  name: string;
  topic: string;
  created_by: string;
  created_at: string;
}

// ----------------------------- Focus Hub -----------------------------

export type FocusMode = "focus" | "short_break" | "long_break";

export interface FocusPreferences {
  user_id: string;
  focus_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  sessions_until_long_break: number;
  auto_switch: boolean;
  ambient_sound: string | null;
  ambient_volume: number;
  ambient_loop: boolean;
  lofi_station: string;
  lofi_source: "youtube" | "spotify";
  daily_goal_hours: number;
  daily_goal_pomodoros: number;
  daily_goal_tasks: number;
  created_at?: string;
  updated_at?: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  mode: FocusMode;
  duration_minutes: number;
  completed: boolean;
  xp_earned: number;
  task_id: string | null;
  task_label: string | null;
  notes: string | null;
  started_at: string;
  ended_at: string;
  created_at: string;
}

export interface FocusDailyStat {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  focus_minutes: number;
  sessions_completed: number;
  pomodoros: number;
  tasks_completed: number;
  xp_earned: number;
  created_at?: string;
  updated_at?: string;
}

export interface FocusAchievement {
  id: string;
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
}

// ----------------------------- Calendar ------------------------------

export type EventKind = "study" | "exam" | "class" | "revision" | "break";

export interface StudyEvent {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  kind: EventKind;
  start_at: string; // ISO timestamp
  end_at: string; // ISO timestamp
  notes: string | null;
  color: string;
  task_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StudyBlockTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string | null;
  duration_minutes: number;
  color: string;
  kind: EventKind;
  created_at?: string;
}

// --------------------------- Notifications ---------------------------

export type NotificationType =
  | "info" | "deadline" | "overdue" | "pomodoro" | "focus" | "achievement" | "system";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  tag: string | null;
  read: boolean;
  snooze_until: string | null;
  created_at: string;
}

export interface NotificationSettings {
  user_id: string;
  browser_enabled: boolean;
  deadlines: boolean;
  overdue: boolean;
  pomodoro: boolean;
  focus_reminders: boolean;
  daily_summary: boolean;
  created_at?: string;
  updated_at?: string;
}
