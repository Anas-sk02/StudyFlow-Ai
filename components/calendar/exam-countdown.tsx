"use client";

import { GraduationCap } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { countdownLabel, colorTokens } from "@/lib/calendar";
import { useCalendar } from "./calendar-provider";
import type { StudyEvent } from "@/lib/types";

export function ExamCountdown({ onSelect }: { onSelect: (ev: StudyEvent) => void }) {
  const { events } = useCalendar();
  const now = new Date();

  const exams = events
    .filter((e) => e.kind === "exam" && differenceInCalendarDays(new Date(e.start_at), now) >= 0)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 6);

  if (exams.length === 0) return null;

  return (
    <div className="glass rounded-3xl p-5 border border-border/60">
      <h3 className="font-bold text-base flex items-center gap-2 mb-4">
        <GraduationCap className="h-4 w-4 text-rose-500" /> Exam Countdown
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {exams.map((ev) => {
          const target = new Date(ev.start_at);
          const days = differenceInCalendarDays(target, now);
          const c = colorTokens(ev.color || "rose");
          return (
            <button
              key={ev.id}
              onClick={() => onSelect(ev)}
              className={cn("rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5", c.ring)}
            >
              <p className="text-3xl font-black tabular-nums leading-none">{days}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                {days === 0 ? "today" : days === 1 ? "day left" : "days left"}
              </p>
              <p className="text-sm font-semibold truncate mt-2">{ev.title}</p>
              <p className="text-xs text-muted-foreground">{countdownLabel(target, now)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
