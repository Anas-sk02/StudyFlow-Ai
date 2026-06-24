"use client";

import { motion } from "framer-motion";
import { Flame, Zap, Clock, Timer } from "lucide-react";
import { useFocus } from "./focus-provider";
import { XP_PER_LEVEL } from "./focus-provider";
import { formatHours } from "@/lib/focus";
import { cn } from "@/lib/utils";

function StatTile({ icon: Icon, value, label, tint, wash }: { icon: typeof Flame; value: string; label: string; tint: string; wash: string }) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5 border border-border/60 relative overflow-hidden">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", wash)} />
      <div className="relative">
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center mb-3", tint)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <p className="text-2xl font-black tabular-nums leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground font-medium mt-1.5 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

export function StreakXP() {
  const { userStats, streak, totalSessions } = useFocus();

  const prevLevelXp = (userStats.level - 1) * XP_PER_LEVEL;
  const nextLevelXp = userStats.level * XP_PER_LEVEL;
  const inLevel = userStats.xp - prevLevelXp;
  const pct = Math.min(100, Math.max(0, (inLevel / XP_PER_LEVEL) * 100));

  return (
    <div className="space-y-4">
      {/* Level / XP banner */}
      <div className="glass rounded-3xl p-6 border border-border/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.07] via-transparent to-indigo-500/[0.06] pointer-events-none" />
        <div className="absolute top-0 right-0 w-44 h-44 bg-primary/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary/20 shrink-0">
            {userStats.level}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-base flex items-center gap-1.5">Level {userStats.level} <Zap className="h-4 w-4 text-amber-500 fill-amber-500" /></p>
            <p className="text-xs text-muted-foreground">{nextLevelXp - userStats.xp} XP to Level {userStats.level + 1}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-black text-lg tabular-nums text-primary">{userStats.xp}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Total XP</p>
          </div>
        </div>
        <div className="relative mt-4 h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut" }} />
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Flame} value={`${streak}`} label="Day Streak" tint="bg-orange-500/15 text-orange-500" wash="from-orange-500/10 to-transparent" />
        <StatTile icon={Timer} value={`${totalSessions}`} label="Sessions" tint="bg-primary/15 text-primary" wash="from-primary/10 to-transparent" />
        <StatTile icon={Clock} value={formatHours(userStats.totalFocusMinutes)} label="Focus Time" tint="bg-indigo-500/15 text-indigo-500" wash="from-indigo-500/10 to-transparent" />
        <StatTile icon={Zap} value={`${userStats.xp}`} label="Total XP" tint="bg-amber-500/15 text-amber-500" wash="from-amber-500/10 to-transparent" />
      </div>
    </div>
  );
}
