"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { toast } from "sonner";
import { createClient } from "@/supabase/client";
import { AmbientEngine } from "@/lib/focus-audio";
import {
  DEFAULT_PREFERENCES, XP_PER_FOCUS_SESSION, XP_PER_LEVEL, levelFromXp,
  evaluateAchievements, computeStreak, dateKey, todayKey, type AmbientSoundId,
  ACHIEVEMENTS,
} from "@/lib/focus";
import type {
  FocusPreferences, FocusMode, FocusSession, FocusDailyStat,
} from "@/lib/types";
import { useNotifications } from "@/components/notifications/notification-provider";

interface UserStats {
  xp: number;
  level: number;
  totalFocusMinutes: number;
  streakDays: number;
}

interface FocusContextValue {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;

  prefs: FocusPreferences;
  updatePrefs: (patch: Partial<FocusPreferences>) => Promise<void>;

  // timer
  mode: FocusMode;
  secondsLeft: number;
  totalSeconds: number;
  isRunning: boolean;
  progress: number;
  cycleCount: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  switchMode: (m: FocusMode) => void;

  // task + notes
  tasks: { id: string; title: string }[];
  currentTask: { id: string | null; label: string };
  setCurrentTask: (t: { id: string | null; label: string }) => void;
  sessionNote: string;
  setSessionNote: (v: string) => void;

  // stats
  userStats: UserStats;
  todayStat: FocusDailyStat | null;
  dailyStats: FocusDailyStat[];
  sessions: FocusSession[];
  totalSessions: number;
  tasksCompletedToday: number;
  streak: number;
  unlocked: Set<string>;

  // audio
  ambient: AmbientSoundId | null;
  toggleAmbient: (id: AmbientSoundId) => void;
  volume: number;
  setVolume: (v: number) => void;

  // fullscreen
  fullscreen: boolean;
  setFullscreen: (v: boolean) => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

export function useFocus(): FocusContextValue {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used within <FocusProvider>");
  return ctx;
}

function minutesForMode(p: FocusPreferences, m: FocusMode): number {
  if (m === "focus") return p.focus_minutes;
  if (m === "short_break") return p.short_break_minutes;
  return p.long_break_minutes;
}

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const { notify } = useNotifications();
  const engineRef = useRef<AmbientEngine | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<FocusPreferences>(DEFAULT_PREFERENCES);

  const [mode, setMode] = useState<FocusMode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_PREFERENCES.focus_minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);

  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [currentTask, setCurrentTask] = useState<{ id: string | null; label: string }>({ id: null, label: "" });
  const [sessionNote, setSessionNote] = useState("");

  const [userStats, setUserStats] = useState<UserStats>({ xp: 0, level: 1, totalFocusMinutes: 0, streakDays: 0 });
  const [todayStat, setTodayStat] = useState<FocusDailyStat | null>(null);
  const [dailyStats, setDailyStats] = useState<FocusDailyStat[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [tasksCompletedToday, setTasksCompletedToday] = useState(0);
  const [streak, setStreak] = useState(0);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());

  const [ambient, setAmbient] = useState<AmbientSoundId | null>(null);
  const [volume, setVolumeState] = useState(DEFAULT_PREFERENCES.ambient_volume);
  const [fullscreen, setFullscreen] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completingRef = useRef(false);
  const startTimeRef = useRef<Date | null>(null);

  const totalSeconds = minutesForMode(prefs, mode) * 60;
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  // ----------------------------------------------------------------- load
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("You must be signed in."); setLoading(false); return; }
      setUserId(user.id);

      const since = new Date();
      since.setDate(since.getDate() - 180);

      const [prefsRes, statsRes, dailyRes, sessRes, achRes, tasksRes] = await Promise.all([
        supabase.from("focus_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_stats").select("xp, level, total_focus_minutes, streak_days").eq("user_id", user.id).maybeSingle(),
        supabase.from("focus_daily_stats").select("*").eq("user_id", user.id).gte("date", dateKey(since)).order("date", { ascending: true }),
        supabase.from("focus_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(40),
        supabase.from("focus_achievements").select("achievement_key").eq("user_id", user.id),
        supabase.from("study_tasks").select("id, title, status").eq("user_id", user.id).neq("status", "done").order("created_at", { ascending: false }).limit(50),
      ]);

      // preferences (create row if missing)
      let p: FocusPreferences;
      if (prefsRes.data) {
        p = { ...DEFAULT_PREFERENCES, ...prefsRes.data } as FocusPreferences;
      } else {
        p = { ...DEFAULT_PREFERENCES, user_id: user.id };
        await supabase.from("focus_preferences").insert({ user_id: user.id });
      }
      setPrefs(p);
      setVolumeState(p.ambient_volume);
      setSecondsLeft(p.focus_minutes * 60);

      if (statsRes.data) {
        setUserStats({
          xp: statsRes.data.xp ?? 0,
          level: statsRes.data.level ?? 1,
          totalFocusMinutes: statsRes.data.total_focus_minutes ?? 0,
          streakDays: statsRes.data.streak_days ?? 0,
        });
      }

      const daily = (dailyRes.data ?? []) as FocusDailyStat[];
      setDailyStats(daily);
      const todayStatNow = daily.find((d) => d.date === todayKey()) ?? null;
      setTodayStat(todayStatNow);
      const streakNow = computeStreak(new Set(daily.filter((d) => d.sessions_completed > 0).map((d) => d.date)));
      setStreak(streakNow);

      setSessions((sessRes.data ?? []) as FocusSession[]);

      // total completed focus sessions
      const { count } = await supabase
        .from("focus_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("mode", "focus")
        .eq("completed", true);
      setTotalSessions(count ?? 0);

      const unlockedSet = new Set((achRes.data ?? []).map((a: { achievement_key: string }) => a.achievement_key));
      setUnlocked(unlockedSet);
      setTasks(((tasksRes.data ?? []) as { id: string; title: string }[]).map((t) => ({ id: t.id, title: t.title })));

      // tasks completed today (from the study planner)
      const { count: doneToday } = await supabase
        .from("study_tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("completed_at", `${todayKey()}T00:00:00`);
      setTasksCompletedToday(doneToday ?? 0);

      // backfill any badges the user already qualifies for. Achievements are
      // normally granted live on session completion, but progress-based ones
      // (sessions, focus time, streak, daily goals) should also be reconciled
      // on load so the gallery never lags behind real progress. Time-of-day
      // badges (night owl / early bird) stay live-only via a neutral hour.
      const goalsMetNow = !!todayStatNow
        && todayStatNow.focus_minutes / 60 >= p.daily_goal_hours
        && todayStatNow.pomodoros >= p.daily_goal_pomodoros
        && (doneToday ?? 0) >= p.daily_goal_tasks;
      const qualified = evaluateAchievements({
        totalSessions: count ?? 0,
        totalFocusMinutes: statsRes.data?.total_focus_minutes ?? 0,
        streakDays: streakNow,
        sessionsToday: todayStatNow?.sessions_completed ?? 0,
        goalsMetToday: goalsMetNow,
        hour: 12,
      });
      const missingBadges = qualified.filter((k) => !unlockedSet.has(k));
      if (missingBadges.length) {
        await supabase.from("focus_achievements").insert(missingBadges.map((k) => ({ user_id: user.id, achievement_key: k })));
        missingBadges.forEach((k) => unlockedSet.add(k));
        setUnlocked(new Set(unlockedSet));
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load Focus Hub. Check your database setup.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load (matches app-wide pattern)
  useEffect(() => { void loadAll(); }, [loadAll]);

  // ----------------------------------------------------------------- engine
  useEffect(() => {
    engineRef.current = new AmbientEngine();
    return () => { engineRef.current?.dispose(); engineRef.current = null; };
  }, []);

  // ----------------------------------------------------------------- prefs
  const updatePrefs = useCallback(async (patch: Partial<FocusPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      // if a duration for the current (idle) mode changed, refresh the clock
      if (!isRunning) {
        const m = next.focus_minutes !== prev.focus_minutes && mode === "focus" ? next.focus_minutes
          : next.short_break_minutes !== prev.short_break_minutes && mode === "short_break" ? next.short_break_minutes
          : next.long_break_minutes !== prev.long_break_minutes && mode === "long_break" ? next.long_break_minutes
          : null;
        if (m !== null) setSecondsLeft(m * 60);
      }
      return next;
    });
    if (userId) {
      const { error: upErr } = await supabase.from("focus_preferences").upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() });
      if (upErr) toast.error("Couldn't save your preferences.");
    }
  }, [supabase, userId, isRunning, mode]);

  // ----------------------------------------------------------------- timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [isRunning]);

  // ----------------------------------------------------------------- persistence on completion
  const persistFocusComplete = useCallback(async () => {
    if (!userId) return;
    const durationMin = prefs.focus_minutes;
    const xp = XP_PER_FOCUS_SESSION;
    const now = new Date();
    const today = todayKey();

    // 1. log the session
    await supabase.from("focus_sessions").insert({
      user_id: userId,
      mode: "focus",
      duration_minutes: durationMin,
      completed: true,
      xp_earned: xp,
      task_id: currentTask.id,
      task_label: currentTask.label || null,
      notes: sessionNote.trim() || null,
      started_at: (startTimeRef.current ?? now).toISOString(),
      ended_at: now.toISOString(),
    });

    // 2. increment today's aggregate (atomic RPC)
    const { data: updatedDay } = await supabase.rpc("increment_focus_daily_stats", {
      p_date: today,
      p_focus_minutes: durationMin,
      p_sessions_completed: 1,
      p_pomodoros: 1,
      p_tasks_completed: 0,
      p_xp_earned: xp,
    });
    const dayRow = (Array.isArray(updatedDay) ? updatedDay[0] : updatedDay) as FocusDailyStat | null;

    // 3. recompute user_stats (xp / level / minutes / streak)
    const newXp = userStats.xp + xp;
    const newMinutes = userStats.totalFocusMinutes + durationMin;
    const newLevel = levelFromXp(newXp);

    // recompute streak from updated daily activity
    const activeDates = new Set(dailyStats.filter((d) => d.sessions_completed > 0).map((d) => d.date));
    activeDates.add(today);
    const newStreak = computeStreak(activeDates);

    await supabase.from("user_stats").upsert({
      user_id: userId,
      xp: newXp,
      level: newLevel,
      total_focus_minutes: newMinutes,
      streak_days: newStreak,
      last_activity_date: today,
      updated_at: now.toISOString(),
    });

    // 4. update local state
    setUserStats({ xp: newXp, level: newLevel, totalFocusMinutes: newMinutes, streakDays: newStreak });
    setStreak(newStreak);
    if (dayRow) {
      setTodayStat(dayRow);
      setDailyStats((prev) => {
        const others = prev.filter((d) => d.date !== today);
        return [...others, dayRow].sort((a, b) => a.date.localeCompare(b.date));
      });
    }
    const newTotal = totalSessions + 1;
    setTotalSessions(newTotal);

    // 5. xp / level toasts
    toast.success(`Focus session complete · +${xp} XP`);
    if (newLevel > userStats.level) toast.success(`Level up! You reached Level ${newLevel} 🎉`);

    // 6. achievements
    const goalsMet = !!dayRow
      && dayRow.focus_minutes / 60 >= prefs.daily_goal_hours
      && dayRow.pomodoros >= prefs.daily_goal_pomodoros
      && tasksCompletedToday >= prefs.daily_goal_tasks;

    const earned = evaluateAchievements({
      totalSessions: newTotal,
      totalFocusMinutes: newMinutes,
      streakDays: newStreak,
      sessionsToday: dayRow?.sessions_completed ?? 1,
      goalsMetToday: goalsMet,
      hour: now.getHours(),
    });
    const fresh = earned.filter((k) => !unlocked.has(k));
    if (fresh.length) {
      await supabase.from("focus_achievements").insert(fresh.map((k) => ({ user_id: userId, achievement_key: k })));
      setUnlocked((prev) => { const n = new Set(prev); fresh.forEach((k) => n.add(k)); return n; });
      fresh.forEach((k) => {
        const def = ACHIEVEMENTS.find((a) => a.key === k);
        if (def) toast.success(`Achievement unlocked · ${def.title} 🏅`);
      });
    }

    // 7. refresh recent sessions list
    void supabase.from("focus_sessions").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(40)
      .then(({ data }) => { if (data) setSessions(data as FocusSession[]); });

    setSessionNote("");
  }, [supabase, userId, prefs, currentTask, sessionNote, userStats, dailyStats, totalSessions, unlocked, tasksCompletedToday]);

  const persistBreakComplete = useCallback(async (m: FocusMode) => {
    if (!userId) return;
    const now = new Date();
    await supabase.from("focus_sessions").insert({
      user_id: userId,
      mode: m,
      duration_minutes: minutesForMode(prefs, m),
      completed: true,
      xp_earned: 0,
      started_at: (startTimeRef.current ?? now).toISOString(),
      ended_at: now.toISOString(),
    });
  }, [supabase, userId, prefs]);

  // ----------------------------------------------------------------- mode transitions
  const goToMode = useCallback((m: FocusMode, autostart: boolean) => {
    completingRef.current = false;
    startTimeRef.current = null;
    setMode(m);
    setSecondsLeft(minutesForMode(prefs, m) * 60);
    setIsRunning(autostart);
    if (autostart) startTimeRef.current = new Date();
  }, [prefs]);

  // completion watcher
  useEffect(() => {
    if (secondsLeft !== 0 || !isRunning || completingRef.current) return;
    completingRef.current = true;
    setIsRunning(false);

    (async () => {
      if (mode === "focus") {
        await persistFocusComplete();
        const nextCycle = cycleCount + 1;
        setCycleCount(nextCycle);
        const longBreak = nextCycle % prefs.sessions_until_long_break === 0;
        const nextMode: FocusMode = longBreak ? "long_break" : "short_break";
        goToMode(nextMode, prefs.auto_switch);
        if (!prefs.auto_switch) toast(`Time for a ${longBreak ? "long" : "short"} break`);
        void notify({
          type: "pomodoro",
          title: "Focus session complete 🎉",
          body: `+${XP_PER_FOCUS_SESSION} XP earned — time for a ${longBreak ? "long" : "short"} break.`,
          link: "/dashboard/focus",
        });
      } else {
        await persistBreakComplete(mode);
        goToMode("focus", prefs.auto_switch);
        if (!prefs.auto_switch) toast("Break over — ready to focus?");
        void notify({
          type: "focus",
          title: "Break over ☕",
          body: "Ready for the next focus session?",
          link: "/dashboard/focus",
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, isRunning, mode]);

  // ----------------------------------------------------------------- controls
  const start = useCallback(() => {
    if (secondsLeft === 0) setSecondsLeft(totalSeconds);
    if (!startTimeRef.current) startTimeRef.current = new Date();
    completingRef.current = false;
    setIsRunning(true);
  }, [secondsLeft, totalSeconds]);

  const pause = useCallback(() => setIsRunning(false), []);

  const reset = useCallback(() => {
    setIsRunning(false);
    completingRef.current = false;
    startTimeRef.current = null;
    setSecondsLeft(totalSeconds);
  }, [totalSeconds]);

  const skip = useCallback(() => {
    if (mode === "focus") {
      const nextCycle = cycleCount + 1;
      setCycleCount(nextCycle);
      const longBreak = nextCycle % prefs.sessions_until_long_break === 0;
      goToMode(longBreak ? "long_break" : "short_break", false);
    } else {
      goToMode("focus", false);
    }
  }, [mode, cycleCount, prefs.sessions_until_long_break, goToMode]);

  const switchMode = useCallback((m: FocusMode) => {
    goToMode(m, false);
  }, [goToMode]);

  // ----------------------------------------------------------------- audio
  const toggleAmbient = useCallback((id: AmbientSoundId) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (ambient === id) {
      engine.stop();
      setAmbient(null);
      void updatePrefs({ ambient_sound: null });
    } else {
      engine.setVolume(volume);
      void engine.play(id);
      setAmbient(id);
      void updatePrefs({ ambient_sound: id });
    }
  }, [ambient, volume, updatePrefs]);

  const volumeSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    engineRef.current?.setVolume(v);
    if (volumeSaveRef.current) clearTimeout(volumeSaveRef.current);
    volumeSaveRef.current = setTimeout(() => { void updatePrefs({ ambient_volume: v }); }, 600);
  }, [updatePrefs]);

  const value: FocusContextValue = {
    loading, error, reload: loadAll,
    prefs, updatePrefs,
    mode, secondsLeft, totalSeconds, isRunning, progress, cycleCount,
    start, pause, reset, skip, switchMode,
    tasks, currentTask, setCurrentTask, sessionNote, setSessionNote,
    userStats, todayStat, dailyStats, sessions, totalSessions, tasksCompletedToday, streak, unlocked,
    ambient, toggleAmbient, volume, setVolume,
    fullscreen, setFullscreen,
  };

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export { XP_PER_LEVEL };
