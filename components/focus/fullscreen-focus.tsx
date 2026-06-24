"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, RotateCcw, SkipForward, Minimize2, X,
  CloudRain, Trees, Coffee, Waves, AudioWaveform, Flame, Moon, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock, AMBIENT_SOUNDS, type AmbientSoundId } from "@/lib/focus";
import { useFocus } from "./focus-provider";

const ICONS: Record<string, LucideIcon> = { CloudRain, Trees, Coffee, Waves, AudioWaveform, Flame, Moon };

const MODE_LABEL = { focus: "Focus", short_break: "Short Break", long_break: "Long Break" } as const;

export function FullscreenFocus() {
  const {
    fullscreen, setFullscreen, mode, secondsLeft, progress, isRunning,
    start, pause, reset, skip, currentTask, ambient, toggleAmbient,
  } = useFocus();

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === " ") { e.preventDefault(); if (isRunning) pause(); else start(); }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [fullscreen, isRunning, pause, start, setFullscreen]);

  const R = 160;
  const C = 2 * Math.PI * R;

  return (
    <AnimatePresence>
      {fullscreen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
        >
          {/* ambient glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className={cn("absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-30",
              mode === "focus" ? "bg-primary" : mode === "short_break" ? "bg-emerald-500" : "bg-sky-500")} />
          </div>

          {/* exit */}
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <button onClick={() => setFullscreen(false)} className="h-11 w-11 rounded-2xl border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="Exit fullscreen"><Minimize2 className="h-5 w-5" /></button>
            <button onClick={() => setFullscreen(false)} className="h-11 w-11 rounded-2xl border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground mb-8">{MODE_LABEL[mode]}</span>

            <div className="relative w-[340px] h-[340px] max-w-[80vw] max-h-[80vw] flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 360 360">
                <circle cx="180" cy="180" r={R} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                <motion.circle
                  cx="180" cy="180" r={R} fill="none" strokeWidth="6" strokeLinecap="round"
                  className={mode === "focus" ? "text-primary" : mode === "short_break" ? "text-emerald-500" : "text-sky-500"}
                  stroke="currentColor" strokeDasharray={C}
                  animate={{ strokeDashoffset: C * (1 - progress) }} transition={{ duration: 0.5, ease: "linear" }}
                />
              </svg>
              <span className="text-7xl sm:text-8xl font-black font-mono tracking-tight tabular-nums">{formatClock(secondsLeft)}</span>
            </div>

            {currentTask.label && (
              <p className="mt-8 text-base text-muted-foreground max-w-md text-center px-4 truncate">
                Working on <span className="text-foreground font-semibold">{currentTask.label}</span>
              </p>
            )}

            {/* controls */}
            <div className="flex items-center gap-4 mt-10">
              <button onClick={reset} className="h-14 w-14 rounded-2xl border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"><RotateCcw className="h-6 w-6" /></button>
              <button
                onClick={isRunning ? pause : start}
                className={cn("px-12 py-5 rounded-2xl font-black flex items-center gap-2.5 transition-all active:scale-95 shadow-xl",
                  isRunning ? "bg-muted text-foreground border border-border" : "bg-primary text-primary-foreground shadow-primary/20 hover:-translate-y-0.5")}
              >
                {isRunning ? <><Pause className="h-5 w-5 fill-current" /> Pause</> : <><Play className="h-5 w-5 fill-current" /> Start</>}
              </button>
              <button onClick={skip} className="h-14 w-14 rounded-2xl border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"><SkipForward className="h-6 w-6" /></button>
            </div>

            {/* ambient quick toggles */}
            <div className="flex items-center gap-2 mt-12">
              {AMBIENT_SOUNDS.map((s) => {
                const Icon = ICONS[s.icon] ?? Waves;
                const active = ambient === (s.id as AmbientSoundId);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleAmbient(s.id as AmbientSoundId)}
                    className={cn("h-10 w-10 rounded-xl border flex items-center justify-center transition-all active:scale-95",
                      active ? "bg-primary/15 border-primary/40 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted")}
                    title={s.label}
                  ><Icon className="h-4 w-4" /></button>
                );
              })}
            </div>

            <p className="mt-8 text-[11px] text-muted-foreground/60">Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">Space</kbd> to start/pause · <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">Esc</kbd> to exit</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
