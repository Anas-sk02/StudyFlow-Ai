import type { FocusPreferences, FocusDailyStat } from "@/lib/types";

// ---------------------------------------------------------------------
//  Defaults
// ---------------------------------------------------------------------
export const DEFAULT_PREFERENCES: FocusPreferences = {
  user_id: "",
  focus_minutes: 25,
  short_break_minutes: 5,
  long_break_minutes: 15,
  sessions_until_long_break: 4,
  auto_switch: true,
  ambient_sound: null,
  ambient_volume: 0.5,
  ambient_loop: true,
  lofi_station: "deep_focus",
  lofi_source: "youtube",
  daily_goal_hours: 4,
  daily_goal_pomodoros: 8,
  daily_goal_tasks: 5,
};

export const XP_PER_FOCUS_SESSION = 50;
export const XP_PER_LEVEL = 250;

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

// ---------------------------------------------------------------------
//  Ambient sounds — each rendered by the Web Audio engine (no assets)
// ---------------------------------------------------------------------
export type AmbientSoundId =
  | "rain"
  | "forest"
  | "coffee"
  | "ocean"
  | "white_noise"
  | "fireplace"
  | "crickets";

export interface AmbientSound {
  id: AmbientSoundId;
  label: string;
  /** lucide-react icon name */
  icon: string;
  /** tailwind text/bg accent token */
  accent: string;
  description: string;
}

export const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: "rain", label: "Rain", icon: "CloudRain", accent: "sky", description: "Steady rainfall" },
  { id: "forest", label: "Forest", icon: "Trees", accent: "emerald", description: "Birds & wind" },
  { id: "coffee", label: "Coffee Shop", icon: "Coffee", accent: "amber", description: "Cafe ambience" },
  { id: "ocean", label: "Ocean", icon: "Waves", accent: "cyan", description: "Rolling waves" },
  { id: "white_noise", label: "White Noise", icon: "AudioWaveform", accent: "slate", description: "Pure static" },
  { id: "fireplace", label: "Fireplace", icon: "Flame", accent: "orange", description: "Crackling fire" },
  { id: "crickets", label: "Night Crickets", icon: "Moon", accent: "indigo", description: "Calm night sounds" },
];

// ---------------------------------------------------------------------
//  Lofi stations (YouTube live streams + Spotify editorial playlists)
// ---------------------------------------------------------------------
export interface LofiStation {
  id: string;
  label: string;
  description: string;
  youtubeId: string;
  spotifyId: string;
  accent: string;
}

export const LOFI_STATIONS: LofiStation[] = [
  {
    id: "deep_focus",
    label: "Deep Focus",
    description: "Mellow lofi hip-hop for deep work",
    youtubeId: "jfKfPfyJRdk",
    spotifyId: "37i9dQZF1DWZeKCadgRdKQ",
    accent: "indigo",
  },
  {
    id: "coding",
    label: "Coding",
    description: "Synthwave & chill beats to build to",
    youtubeId: "4xDzrJKXOOY",
    spotifyId: "37i9dQZF1DX5trt9i14X7j",
    accent: "violet",
  },
  {
    id: "exam_prep",
    label: "Exam Prep",
    description: "Instrumental focus for revision",
    youtubeId: "jfKfPfyJRdk",
    spotifyId: "37i9dQZF1DX9sIqqvKsjG8",
    accent: "emerald",
  },
  {
    id: "relaxed",
    label: "Relaxed Study",
    description: "Calm, warm and easy beats",
    youtubeId: "rUxyKA_-grg",
    spotifyId: "37i9dQZF1DWWQRwui0ExPn",
    accent: "amber",
  },
  {
    id: "night",
    label: "Night Coding",
    description: "Late-night sleepy lofi",
    youtubeId: "rUxyKA_-grg",
    spotifyId: "37i9dQZF1DWYcDQ1hSjOpY",
    accent: "sky",
  },
];

// ---------------------------------------------------------------------
//  Achievements
// ---------------------------------------------------------------------
export type AchievementTier = "bronze" | "silver" | "gold";

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string; // lucide name
  tier: AchievementTier;
}

/** Snapshot used to evaluate which achievements should be unlocked. */
export interface AchievementContext {
  totalSessions: number;
  totalFocusMinutes: number;
  streakDays: number;
  sessionsToday: number;
  goalsMetToday: boolean;
  hour: number; // hour-of-day of the session just completed (0-23)
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_session", title: "First Steps", description: "Complete your first focus session", icon: "Footprints", tier: "bronze" },
  { key: "sessions_10", title: "Getting Serious", description: "Complete 10 focus sessions", icon: "Target", tier: "bronze" },
  { key: "sessions_50", title: "Focused Mind", description: "Complete 50 focus sessions", icon: "Brain", tier: "silver" },
  { key: "sessions_100", title: "Centurion", description: "Complete 100 focus sessions", icon: "Medal", tier: "gold" },
  { key: "focus_60", title: "One Hour Strong", description: "Reach 1 hour of total focus", icon: "Clock", tier: "bronze" },
  { key: "focus_600", title: "Ten Hour Club", description: "Reach 10 hours of total focus", icon: "Hourglass", tier: "silver" },
  { key: "focus_3000", title: "Marathon Mind", description: "Reach 50 hours of total focus", icon: "Trophy", tier: "gold" },
  { key: "streak_3", title: "Warming Up", description: "Hold a 3-day focus streak", icon: "Flame", tier: "bronze" },
  { key: "streak_7", title: "Week Warrior", description: "Hold a 7-day focus streak", icon: "CalendarCheck", tier: "silver" },
  { key: "streak_30", title: "Unstoppable", description: "Hold a 30-day focus streak", icon: "Crown", tier: "gold" },
  { key: "daily_8", title: "Power Day", description: "Finish 8 sessions in one day", icon: "Zap", tier: "silver" },
  { key: "goal_crusher", title: "Goal Crusher", description: "Hit all daily goals in a single day", icon: "CheckCircle2", tier: "gold" },
  { key: "night_owl", title: "Night Owl", description: "Focus after 10 PM", icon: "MoonStar", tier: "bronze" },
  { key: "early_bird", title: "Early Bird", description: "Focus before 7 AM", icon: "Sunrise", tier: "bronze" },
];

/** Returns the keys of achievements that the context satisfies. */
export function evaluateAchievements(ctx: AchievementContext): string[] {
  const unlocked: string[] = [];
  const add = (key: string, cond: boolean) => { if (cond) unlocked.push(key); };

  add("first_session", ctx.totalSessions >= 1);
  add("sessions_10", ctx.totalSessions >= 10);
  add("sessions_50", ctx.totalSessions >= 50);
  add("sessions_100", ctx.totalSessions >= 100);
  add("focus_60", ctx.totalFocusMinutes >= 60);
  add("focus_600", ctx.totalFocusMinutes >= 600);
  add("focus_3000", ctx.totalFocusMinutes >= 3000);
  add("streak_3", ctx.streakDays >= 3);
  add("streak_7", ctx.streakDays >= 7);
  add("streak_30", ctx.streakDays >= 30);
  add("daily_8", ctx.sessionsToday >= 8);
  add("goal_crusher", ctx.goalsMetToday);
  add("night_owl", ctx.hour >= 22);
  add("early_bird", ctx.hour < 7);

  return unlocked;
}

// ---------------------------------------------------------------------
//  Date helpers (local-timezone safe — avoids UTC off-by-one)
// ---------------------------------------------------------------------
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

/** Difference in whole days between two YYYY-MM-DD keys (a - b). */
export function dayDiff(aKey: string, bKey: string): number {
  const a = new Date(aKey + "T00:00:00");
  const b = new Date(bKey + "T00:00:00");
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/**
 * Compute current streak (consecutive days ending today/yesterday) from
 * a set of dates that had at least one completed focus session.
 */
export function computeStreak(activeDates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  // allow the streak to "still count" if today has no session yet but
  // yesterday did — start checking from today, break only after a real gap.
  if (!activeDates.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeDates.has(dateKey(cursor))) return 0;
  }
  while (activeDates.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Build a contiguous list of day stats for the last `days` days (oldest→newest). */
export function buildDailySeries(
  stats: FocusDailyStat[],
  days: number,
): { date: string; focus_minutes: number; sessions_completed: number; pomodoros: number }[] {
  const map = new Map(stats.map((s) => [s.date, s]));
  const out: { date: string; focus_minutes: number; sessions_completed: number; pomodoros: number }[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const key = dateKey(cursor);
    const s = map.get(key);
    out.push({
      date: key,
      focus_minutes: s?.focus_minutes ?? 0,
      sessions_completed: s?.sessions_completed ?? 0,
      pomodoros: s?.pomodoros ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatHours(minutes: number): string {
  const h = minutes / 60;
  if (h >= 10) return `${Math.round(h)}h`;
  return `${h.toFixed(1)}h`;
}
