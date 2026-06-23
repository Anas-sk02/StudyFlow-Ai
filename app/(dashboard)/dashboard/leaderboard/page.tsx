"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/supabase/client";
import { 
  Trophy,
  Flame,
  Clock,
  Play,
  Pause,
  RotateCcw, 
  Zap, 
  Sparkles,
  Crown,
  Timer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LeaderboardEntrySkeleton } from "@/components/ui/skeleton";
import Image from "next/image";

type LeaderboardEntry = {
  userId: string;
  xp: number;
  level: number;
  streakDays: number;
  totalFocusMinutes: number;
  fullName: string;
  avatarUrl?: string;
};

export default function LeaderboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [localStats, setLocalStats] = useState({
    xp: 0,
    level: 1,
    totalFocusMinutes: 0,
    streakDays: 0
  });

  // Pomodoro Focus Timer State
  const FOCUS_MINUTES = 25;
  const BREAK_MINUTES = 5;
  const [timeLeft, setTimeLeft] = useState(FOCUS_MINUTES * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false);

  // Initialize
  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setCurrentUserEmail(user.email);
      await loadUserStats();
      await loadLeaderboard();
    })();
  }, [supabase]);

  // Timer Tick Effect — fixed: only depends on timerActive, not timeLeft
  useEffect(() => {
    if (timerActive) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Complete on next tick
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timerActive]);

  // Watch for timer completion — separate from the tick effect
  useEffect(() => {
    if (timeLeft === 0 && timerActive && !completedRef.current) {
      completedRef.current = true;
      void handleTimerComplete();
    }
  }, [timeLeft, timerActive]);

  const loadUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Setup default stats entry
          const todayStr = new Date().toISOString().split("T")[0];
          const initPayload = {
            user_id: user.id,
            xp: 20, // Starter XP
            level: 1,
            streak_days: 1,
            last_activity_date: todayStr
          };
          
          await supabase.from("user_stats").insert(initPayload);
          setLocalStats({
            xp: 20,
            level: 1,
            totalFocusMinutes: 0,
            streakDays: 1
          });
        }
      } else if (data) {
        setLocalStats({
          xp: data.xp || 0,
          level: data.level || 1,
          totalFocusMinutes: data.total_focus_minutes || 0,
          streakDays: data.streak_days || 0
        });
      }
    } catch (err) {
      console.error("Error loading user stats", err);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("user_stats")
        .select("xp, level, streak_days, total_focus_minutes, user_id")
        .order("xp", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch profiles to map names/avatars
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, email, full_name, username, avatar_url");

      const profileMap: Record<string, any> = {};
      if (profilesData) {
        profilesData.forEach((p) => {
          profileMap[p.id] = p;
        });
      }

      const leaders: LeaderboardEntry[] = (data || []).map((stat: any) => {
        const prof = profileMap[stat.user_id] || {};
        return {
          userId: stat.user_id,
          xp: stat.xp,
          level: stat.level,
          streakDays: stat.streak_days,
          totalFocusMinutes: stat.total_focus_minutes,
          fullName: prof.full_name || prof.username || prof.email?.split("@")[0] || "Student",
          avatarUrl: prof.avatar_url
        };
      });

      setLeaderboard(leaders);
    } catch (err) {
      console.error("Error loading leaderboard", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimerComplete = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimerActive(false);

    if (!isBreak) {
      setSessionCount((prev) => prev + 1);
      toast.success(`Focus session complete! +50 XP earned.`);
      await updateStatsFromFocus(FOCUS_MINUTES, 50);
      setIsBreak(true);
      setTimeLeft(BREAK_MINUTES * 60);
    } else {
      toast.success("Break is over! Ready for another round?");
      setIsBreak(false);
      setTimeLeft(FOCUS_MINUTES * 60);
    }

    // Reset completion guard for next session
    completedRef.current = false;
  };

  const updateStatsFromFocus = async (minutes: number, xpAwarded: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      let currentXp = 0;
      let currentLevel = 1;
      let currentMinutes = 0;
      let currentStreak = 0;
      let lastActivityDate = null;

      if (data) {
        currentXp = data.xp || 0;
        currentLevel = data.level || 1;
        currentMinutes = data.total_focus_minutes || 0;
        currentStreak = data.streak_days || 0;
        lastActivityDate = data.last_activity_date;
      }

      const newXp = currentXp + xpAwarded;
      const newLevel = Math.floor(newXp / 250) + 1; // 250 XP per level
      const newMinutes = currentMinutes + minutes;

      // Handle daily streak update
      const todayStr = new Date().toISOString().split("T")[0];
      let newStreak = currentStreak || 1;

      if (lastActivityDate) {
        const lastDate = new Date(lastActivityDate);
        const today = new Date(todayStr);
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak = currentStreak + 1;
        } else if (diffDays > 1) {
          newStreak = 1; // Reset streak
        }
      } else {
        newStreak = 1;
      }

      await supabase
        .from("user_stats")
        .upsert({
          user_id: user.id,
          xp: newXp,
          level: newLevel,
          total_focus_minutes: newMinutes,
          streak_days: newStreak,
          last_activity_date: todayStr,
          updated_at: new Date().toISOString()
        });

      setLocalStats({
        xp: newXp,
        level: newLevel,
        totalFocusMinutes: newMinutes,
        streakDays: newStreak
      });

      await loadLeaderboard();

      if (newLevel > currentLevel) {
        toast.success(`🎉 LEVEL UP! You reached Level ${newLevel}!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save focus study statistics.");
    }
  };

  const toggleTimer = () => {
    setTimerActive(!timerActive);
  };

  const resetTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimerActive(false);
    completedRef.current = false;
    setTimeLeft(isBreak ? BREAK_MINUTES * 60 : FOCUS_MINUTES * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const nextLevelXp = localStats.level * 250;
  const prevLevelXp = (localStats.level - 1) * 250;
  const xpInCurrentLevel = localStats.xp - prevLevelXp;
  const levelProgress = Math.min(100, Math.max(0, (xpInCurrentLevel / 250) * 100));

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">
          Leaderboard & Focus Studio
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-lg">
          Complete Pomodoro focus sessions, maintain daily streaks, earn XP, and climb the leaderboard!
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Stats Overview & Focus Timer */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Level and XP Card */}
          <div className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-border/60">
            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-primary/20">
                  Lvl {localStats.level}
                </div>
                <div>
                  <h3 className="font-extrabold text-xl flex items-center gap-2">
                    Level Progress <Sparkles className="h-4.5 w-4.5 text-amber-500" />
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {localStats.xp} Total XP • Earn {nextLevelXp - localStats.xp} XP to reach Level {localStats.level + 1}
                  </p>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Flame className="h-6 w-6 text-orange-500 fill-orange-500" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Streak</p>
                    <p className="font-extrabold text-lg leading-tight">{localStats.streakDays} Days</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-6 w-6 text-indigo-500" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Focus Time</p>
                    <p className="font-extrabold text-lg leading-tight">{(localStats.totalFocusMinutes / 60).toFixed(1)} hrs</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>{prevLevelXp} XP</span>
                <span>{nextLevelXp} XP</span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-border/20">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* Pomodoro Focus Timer Card */}
          <div className="glass rounded-3xl p-8 border border-border/60 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />
            
            <div className="z-10 space-y-6 w-full max-w-sm">
              <div className="flex items-center justify-center gap-2 mx-auto bg-primary/10 border border-primary/20 text-primary px-4 py-1.5 rounded-full w-fit">
                <Timer className="h-4.5 w-4.5" />
                <span className="text-xs font-black uppercase tracking-wider">
                  {isBreak ? "Break Session" : "Focus Session"}
                </span>
              </div>

              {/* Interactive Circle Timer Visualizer */}
              <div className="relative w-56 h-56 mx-auto flex items-center justify-center">
                {/* SVG Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 224 224">
                  <circle
                    cx="112" cy="112" r="100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-muted/20"
                  />
                  <circle
                    cx="112" cy="112" r="100"
                    fill="none"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className={isBreak ? "text-emerald-500" : "text-primary"}
                    stroke="currentColor"
                    strokeDasharray={`${2 * Math.PI * 100}`}
                    strokeDashoffset={`${2 * Math.PI * 100 * (1 - timeLeft / (isBreak ? BREAK_MINUTES * 60 : FOCUS_MINUTES * 60))}`}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>

                {/* Time Display */}
                <div className="text-5xl font-black font-mono tracking-tight text-foreground select-none">
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Session Counter */}
              {sessionCount > 0 && (
                <div className="text-xs font-medium text-muted-foreground flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {sessionCount} session{sessionCount !== 1 ? "s" : ""} completed
                </div>
              )}

              {/* Timer Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={resetTimer}
                  className="p-3.5 rounded-2xl border border-border/60 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all active:scale-95"
                  title="Reset Timer"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button
                  onClick={toggleTimer}
                  className={cn(
                    "px-8 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl flex items-center gap-2",
                    timerActive 
                      ? "bg-muted text-foreground border border-border hover:bg-muted/80" 
                      : "bg-primary text-primary-foreground shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
                  )}
                >
                  {timerActive ? (
                    <>
                      <Pause className="h-4.5 w-4.5 fill-current" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4.5 w-4.5 fill-current" /> Start Focus
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {isBreak 
                  ? "Take a short rest, stretch, or grab some water!" 
                  : "Keep distraction-free. Completed sessions automatically grant focus statistics."}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Global Leaderboard */}
        <div className="glass rounded-3xl p-6 sm:p-8 border border-border/60 flex flex-col h-full self-stretch">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> Leaderboard
            </h3>
            <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-lg">Top 10</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <LeaderboardEntrySkeleton key={i} />
              ))
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No leaderboard entries found. Start studying to rank up!
              </div>
            ) : (
              leaderboard.map((user, index) => {
                const isCurrentUser = user.fullName.toLowerCase().includes(currentUserEmail.split('@')[0].toLowerCase());
                const rank = index + 1;
                
                return (
                  <div 
                    key={user.userId} 
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-2xl border transition-all",
                      isCurrentUser 
                        ? "bg-primary/5 border-primary/20 text-foreground" 
                        : "border-transparent bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Indicator */}
                      <div className="w-6 text-center font-black text-sm flex items-center justify-center shrink-0">
                        {rank === 1 ? (
                          <Crown className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
                        ) : rank === 2 ? (
                          <span className="text-slate-400">2nd</span>
                        ) : rank === 3 ? (
                          <span className="text-amber-700">3rd</span>
                        ) : (
                          <span>{rank}</span>
                        )}
                      </div>

                      {/* User Avatar & Name */}
                      {user.avatarUrl ? (
                        <Image 
                          src={user.avatarUrl} 
                          alt={user.fullName} 
                          width={32} 
                          height={32} 
                          className="rounded-full object-cover w-8 h-8 shrink-0" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0 uppercase">
                          {user.fullName.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className={cn("text-sm font-bold truncate", isCurrentUser && "text-foreground")}>{user.fullName}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">Level {user.level}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-sm text-primary flex items-center gap-1 justify-end">
                        <Zap className="h-3 w-3 fill-current text-indigo-500" /> {user.xp} XP
                      </p>
                      <p className="text-[9px] text-muted-foreground font-medium flex items-center gap-0.5 justify-end">
                        <Flame className="h-2.5 w-2.5 text-orange-500 fill-orange-500" /> {user.streakDays} day streak
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
