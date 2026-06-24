"use client";

import { NotebookPen, History, Coffee, Brain, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { useFocus } from "./focus-provider";
import type { FocusMode } from "@/lib/types";

const MODE_BADGE: Record<FocusMode, { label: string; icon: typeof Brain; cls: string }> = {
  focus: { label: "Focus", icon: Brain, cls: "bg-primary/10 text-primary" },
  short_break: { label: "Short break", icon: Coffee, cls: "bg-emerald-500/10 text-emerald-500" },
  long_break: { label: "Long break", icon: Moon, cls: "bg-sky-500/10 text-sky-500" },
};

export function SessionNotes() {
  const { sessionNote, setSessionNote, sessions } = useFocus();

  return (
    <div className="glass rounded-3xl p-6 border border-border/60 flex flex-col">
      <h3 className="font-bold text-base flex items-center gap-2 mb-4"><NotebookPen className="h-4 w-4 text-primary" /> Session Notes</h3>

      <textarea
        value={sessionNote}
        onChange={(e) => setSessionNote(e.target.value)}
        placeholder="Jot down what you're working on. Notes are saved with your next completed focus session…"
        rows={3}
        className="w-full resize-none rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none"
      />

      <div className="flex items-center gap-2 mt-6 mb-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-bold">Session History</h4>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-10 border border-dashed border-border rounded-2xl">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <History className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No sessions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Complete a focus session to start your history.</p>
          </div>
        ) : (
          sessions.map((s) => {
            const badge = MODE_BADGE[s.mode];
            const Icon = badge.icon;
            return (
              <div key={s.id} className="rounded-2xl border border-border/50 bg-muted/10 p-3.5 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold", badge.cls)}>
                    <Icon className="h-3 w-3" /> {badge.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(s.created_at)}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{s.duration_minutes} min</span>
                  {s.xp_earned > 0 && <span className="text-amber-500 font-semibold">+{s.xp_earned} XP</span>}
                  {s.task_label && <span className="truncate">· {s.task_label}</span>}
                </div>
                {s.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">“{s.notes}”</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
