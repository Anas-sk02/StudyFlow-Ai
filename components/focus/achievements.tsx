"use client";

import {
  Footprints, Target, Brain, Medal, Clock, Hourglass, Trophy, Flame,
  CalendarCheck, Crown, Zap, CheckCircle2, MoonStar, Sunrise, Lock, Award,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ACHIEVEMENTS, type AchievementTier } from "@/lib/focus";
import { useFocus } from "./focus-provider";

const ICONS: Record<string, LucideIcon> = {
  Footprints, Target, Brain, Medal, Clock, Hourglass, Trophy, Flame,
  CalendarCheck, Crown, Zap, CheckCircle2, MoonStar, Sunrise,
};

const TIER: Record<AchievementTier, { ring: string; bg: string; text: string; label: string }> = {
  bronze: { ring: "border-amber-700/40", bg: "bg-amber-700/10", text: "text-amber-700 dark:text-amber-600", label: "Bronze" },
  silver: { ring: "border-slate-400/40", bg: "bg-slate-400/10", text: "text-slate-400", label: "Silver" },
  gold: { ring: "border-amber-400/50", bg: "bg-amber-400/10", text: "text-amber-500", label: "Gold" },
};

export function Achievements() {
  const { unlocked } = useFocus();
  const total = ACHIEVEMENTS.length;
  const earned = ACHIEVEMENTS.filter((a) => unlocked.has(a.key)).length;

  return (
    <div className="glass rounded-3xl p-6 border border-border/60">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-base flex items-center gap-2"><Award className="h-4 w-4 text-amber-500" /> Badge Gallery</h3>
        <span className="text-xs font-bold bg-muted text-muted-foreground px-2.5 py-1 rounded-lg tabular-nums">{earned}/{total}</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {ACHIEVEMENTS.map((a) => {
          const Icon = ICONS[a.icon] ?? Trophy;
          const got = unlocked.has(a.key);
          const tier = TIER[a.tier];
          return (
            <div
              key={a.key}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all",
                got ? cn(tier.ring, tier.bg) : "border-border/50 bg-muted/10",
              )}
              title={`${a.title} — ${a.description}`}
            >
              <div className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                got ? cn(tier.bg, tier.text) : "bg-muted/40 text-muted-foreground/40",
              )}>
                {got ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
              </div>
              <span className={cn("text-[10px] font-bold leading-tight line-clamp-2", got ? "text-foreground" : "text-muted-foreground/60")}>
                {a.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
