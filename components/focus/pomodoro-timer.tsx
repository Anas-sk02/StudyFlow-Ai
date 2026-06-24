"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, RotateCcw, SkipForward, Settings2, Maximize2, Minus, Plus, Check, ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/focus";
import { useFocus } from "./focus-provider";
import type { FocusMode } from "@/lib/types";

const MODE_META: Record<FocusMode, { label: string; ring: string; glow: string }> = {
  focus: { label: "Focus", ring: "text-primary", glow: "shadow-primary/20" },
  short_break: { label: "Short Break", ring: "text-emerald-500", glow: "shadow-emerald-500/20" },
  long_break: { label: "Long Break", ring: "text-sky-500", glow: "shadow-sky-500/20" },
};

function Stepper({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="h-7 w-7 rounded-lg border border-border/60 flex items-center justify-center hover:bg-muted transition-colors active:scale-95"
        ><Minus className="h-3.5 w-3.5" /></button>
        <span className="w-10 text-center text-sm font-bold tabular-nums">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="h-7 w-7 rounded-lg border border-border/60 flex items-center justify-center hover:bg-muted transition-colors active:scale-95"
        ><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

export function PomodoroTimer() {
  const {
    mode, secondsLeft, isRunning, progress, cycleCount,
    start, pause, reset, skip, switchMode, prefs, updatePrefs,
    tasks, currentTask, setCurrentTask, setFullscreen,
  } = useFocus();

  const [showSettings, setShowSettings] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  const meta = MODE_META[mode];
  const R = 130;
  const C = 2 * Math.PI * R;
  const dotsCount = prefs.sessions_until_long_break;
  const cycleDot = cycleCount % dotsCount;

  return (
    <div className={cn("glass rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-border/60")}>
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

      {/* Mode tabs */}
      <div className="relative flex items-center justify-center">
        <div className="inline-flex rounded-2xl bg-muted/40 p-1 border border-border/50">
          {(Object.keys(MODE_META) as FocusMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={cn(
                "relative px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-colors",
                mode === m ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode === m && (
                <motion.span layoutId="modePill" className="absolute inset-0 bg-background rounded-xl shadow-sm" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <span className="relative z-10">{MODE_META[m].label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className={cn(
            "absolute right-0 h-9 w-9 rounded-xl border border-border/60 flex items-center justify-center transition-colors",
            showSettings ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
          )}
          aria-label="Timer settings"
        ><Settings2 className="h-4 w-4" /></button>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <Stepper label="Focus (min)" value={prefs.focus_minutes} min={5} max={120} step={5} onChange={(v) => updatePrefs({ focus_minutes: v })} />
              <Stepper label="Short break (min)" value={prefs.short_break_minutes} min={1} max={30} onChange={(v) => updatePrefs({ short_break_minutes: v })} />
              <Stepper label="Long break (min)" value={prefs.long_break_minutes} min={5} max={60} step={5} onChange={(v) => updatePrefs({ long_break_minutes: v })} />
              <Stepper label="Sessions → long break" value={prefs.sessions_until_long_break} min={2} max={8} onChange={(v) => updatePrefs({ sessions_until_long_break: v })} />
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-sm text-muted-foreground">Auto-switch sessions</span>
                <button
                  onClick={() => updatePrefs({ auto_switch: !prefs.auto_switch })}
                  className={cn("relative h-6 w-11 rounded-full transition-colors", prefs.auto_switch ? "bg-primary" : "bg-muted-foreground/30")}
                >
                  <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", prefs.auto_switch ? "translate-x-5" : "translate-x-0.5")} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ring */}
      <div className="mt-7 flex flex-col items-center">
        <div className="relative w-[280px] h-[280px] max-w-full flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r={R} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
            <motion.circle
              cx="150" cy="150" r={R} fill="none" strokeWidth="8" strokeLinecap="round"
              className={meta.ring} stroke="currentColor"
              strokeDasharray={C}
              animate={{ strokeDashoffset: C * (1 - progress) }}
              transition={{ duration: 0.5, ease: "linear" }}
            />
          </svg>
          <div className="flex flex-col items-center select-none">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">{meta.label}</span>
            <span className="text-6xl font-black font-mono tracking-tight tabular-nums">{formatClock(secondsLeft)}</span>
            {/* cycle dots */}
            <div className="flex items-center gap-1.5 mt-3">
              {[...Array(dotsCount)].map((_, i) => (
                <span key={i} className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i < cycleDot ? "bg-primary" : "bg-muted-foreground/25",
                )} />
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-7">
          <button
            onClick={reset}
            className="h-12 w-12 rounded-2xl border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
            aria-label="Reset"
          ><RotateCcw className="h-5 w-5" /></button>

          <button
            onClick={isRunning ? pause : start}
            className={cn(
              "px-9 py-4 rounded-2xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 shadow-xl",
              isRunning ? "bg-muted text-foreground border border-border hover:bg-muted/70"
                : cn("bg-primary text-primary-foreground hover:-translate-y-0.5", meta.glow),
            )}
          >
            {isRunning ? <><Pause className="h-4 w-4 fill-current" /> Pause</> : <><Play className="h-4 w-4 fill-current" /> Start</>}
          </button>

          <button
            onClick={skip}
            className="h-12 w-12 rounded-2xl border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
            aria-label="Skip"
          ><SkipForward className="h-5 w-5" /></button>
        </div>

        {/* Current task + fullscreen */}
        <div className="mt-6 w-full max-w-sm space-y-2">
          <div className="relative">
            <button
              onClick={() => setShowTasks((s) => !s)}
              className="w-full flex items-center gap-2.5 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
            >
              <ListTodo className="h-4 w-4 text-primary shrink-0" />
              <span className={cn("truncate text-left flex-1", !currentTask.label && "text-muted-foreground")}>
                {currentTask.label || "Pick a task to focus on…"}
              </span>
            </button>
            <AnimatePresence>
              {showTasks && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="absolute z-20 mt-2 w-full max-h-56 overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl p-2"
                >
                  <button
                    onClick={() => { setCurrentTask({ id: null, label: "" }); setShowTasks(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >No task</button>
                  {tasks.length === 0 && (
                    <p className="px-3 py-3 text-xs text-muted-foreground text-center">No active tasks. Add some in the Study Planner.</p>
                  )}
                  {tasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setCurrentTask({ id: t.id, label: t.title }); setShowTasks(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-muted transition-colors text-left"
                    >
                      {currentTask.id === t.id ? <Check className="h-3.5 w-3.5 text-primary shrink-0" /> : <span className="h-3.5 w-3.5 shrink-0" />}
                      <span className="truncate">{t.title}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setFullscreen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border/60 px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Enter Fullscreen Focus
          </button>
        </div>
      </div>
    </div>
  );
}
