"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Target, Clock, Timer, CheckCircle2, Settings2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocus } from "./focus-provider";

function GoalBar({ icon: Icon, label, value, goal, unit, color }: {
  icon: typeof Clock; label: string; value: number; goal: number; unit: string; color: string;
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const done = value >= goal && goal > 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Icon className={cn("h-4 w-4", color)} /> {label}
        </span>
        <span className="text-xs font-bold tabular-nums">
          {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 inline mr-1 -mt-0.5" />}
          {value % 1 === 0 ? value : value.toFixed(1)}<span className="text-muted-foreground font-medium">/{goal}{unit}</span>
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", done ? "bg-emerald-500" : "bg-gradient-to-r from-primary to-indigo-500")}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function Stepper({ value, min, max, step = 1, onChange }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => onChange(Math.max(min, value - step))} className="h-6 w-6 rounded-md border border-border/60 flex items-center justify-center hover:bg-muted active:scale-95"><Minus className="h-3 w-3" /></button>
      <span className="w-8 text-center text-sm font-bold tabular-nums">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + step))} className="h-6 w-6 rounded-md border border-border/60 flex items-center justify-center hover:bg-muted active:scale-95"><Plus className="h-3 w-3" /></button>
    </div>
  );
}

export function DailyGoals() {
  const { todayStat, prefs, updatePrefs, tasksCompletedToday } = useFocus();
  const [editing, setEditing] = useState(false);

  const hours = (todayStat?.focus_minutes ?? 0) / 60;
  const pomodoros = todayStat?.pomodoros ?? 0;

  const allDone = hours >= prefs.daily_goal_hours && pomodoros >= prefs.daily_goal_pomodoros && tasksCompletedToday >= prefs.daily_goal_tasks;

  return (
    <div className="glass rounded-3xl p-6 border border-border/60">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Today&apos;s Goals</h3>
        <button
          onClick={() => setEditing((e) => !e)}
          className={cn("h-8 w-8 rounded-xl border flex items-center justify-center transition-colors", editing ? "bg-primary/10 border-primary/30 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted")}
        ><Settings2 className="h-4 w-4" /></button>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-indigo-500" /> Study hours</span><Stepper value={prefs.daily_goal_hours} min={1} max={16} onChange={(v) => updatePrefs({ daily_goal_hours: v })} /></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm"><Timer className="h-4 w-4 text-primary" /> Pomodoros</span><Stepper value={prefs.daily_goal_pomodoros} min={1} max={24} onChange={(v) => updatePrefs({ daily_goal_pomodoros: v })} /></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Tasks done</span><Stepper value={prefs.daily_goal_tasks} min={1} max={20} onChange={(v) => updatePrefs({ daily_goal_tasks: v })} /></div>
        </div>
      ) : (
        <div className="space-y-4">
          <GoalBar icon={Clock} label="Study hours" value={hours} goal={prefs.daily_goal_hours} unit="h" color="text-indigo-500" />
          <GoalBar icon={Timer} label="Pomodoros" value={pomodoros} goal={prefs.daily_goal_pomodoros} unit="" color="text-primary" />
          <GoalBar icon={CheckCircle2} label="Tasks done" value={tasksCompletedToday} goal={prefs.daily_goal_tasks} unit="" color="text-emerald-500" />
          {allDone && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> All goals smashed today. Incredible work! 🎉
            </div>
          )}
        </div>
      )}
    </div>
  );
}
