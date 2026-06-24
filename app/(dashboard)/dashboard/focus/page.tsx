"use client";

import { Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
import { FocusProvider, useFocus } from "@/components/focus/focus-provider";
import { FocusHubSkeleton } from "@/components/focus/focus-skeletons";
import { PomodoroTimer } from "@/components/focus/pomodoro-timer";
import { AmbientSounds } from "@/components/focus/ambient-sounds";
import { LofiPanel } from "@/components/focus/lofi-panel";
import { DailyGoals } from "@/components/focus/daily-goals";
import { StreakXP } from "@/components/focus/streak-xp";
import { Achievements } from "@/components/focus/achievements";
import { FocusAnalytics } from "@/components/focus/focus-analytics";
import { SessionNotes } from "@/components/focus/session-notes";
import { FullscreenFocus } from "@/components/focus/fullscreen-focus";

function FocusHubContent() {
  const { loading, error, reload } = useFocus();

  if (loading) return <FocusHubSkeleton />;

  if (error) {
    return (
      <div className="glass rounded-3xl p-10 md:p-14 text-center max-w-lg mx-auto border border-red-500/20">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="text-lg font-bold mb-1.5">Couldn&apos;t load Focus Hub</h2>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <button
          onClick={() => void reload()}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold hover:-translate-y-0.5 transition-transform"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">
              Focus Hub
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
              <Sparkles className="h-3 w-3" /> Pro
            </span>
          </div>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Your distraction-free workspace — Pomodoro, ambient sound, lofi, goals & rewards.
          </p>
        </div>
      </div>

      {/* Stats / streak / xp */}
      <StreakXP />

      {/* Timer + side panels */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <PomodoroTimer />
        </div>
        <div className="space-y-6">
          <DailyGoals />
          <AmbientSounds />
        </div>
      </div>

      {/* Lofi + Notes */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <LofiPanel />
        <SessionNotes />
      </div>

      {/* Analytics */}
      <FocusAnalytics />

      {/* Achievements */}
      <Achievements />

      {/* Fullscreen overlay */}
      <FullscreenFocus />
    </div>
  );
}

export default function FocusHubPage() {
  return (
    <FocusProvider>
      <FocusHubContent />
    </FocusProvider>
  );
}
