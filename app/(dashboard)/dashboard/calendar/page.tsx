"use client";

import { useState } from "react";
import { addMonths, addWeeks } from "date-fns";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, AlertTriangle, RefreshCw, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { colorTokens, type CalendarItem } from "@/lib/calendar";
import { CalendarProvider, useCalendar } from "@/components/calendar/calendar-provider";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { AgendaView } from "@/components/calendar/agenda-view";
import { ExamCountdown } from "@/components/calendar/exam-countdown";
import { CalendarDialog, type Selection } from "@/components/calendar/event-dialog";
import { Skeleton } from "@/components/ui/skeleton";

type View = "month" | "week" | "agenda";

function titleFor(view: View, cursor: Date): string {
  if (view === "agenda") return "Upcoming";
  return cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function CalendarInner() {
  const { loading, error, reload, items, events, templates, focusByDate, rescheduleItem, deleteTemplate } = useCalendar();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selection, setSelection] = useState<Selection | null>(null);

  const move = (dir: -1 | 1) => {
    setCursor((c) => (view === "week" ? addWeeks(c, dir) : addMonths(c, dir)));
  };

  const onDropItem = (itemId: string, day: Date) => {
    const item = items.find((it) => it.id === itemId);
    if (item) void rescheduleItem(item, day);
  };

  const selectItem = (item: CalendarItem) => {
    if (item.type === "task") setSelection({ mode: "task", item });
    else if (item.type === "focus") setSelection({ mode: "focus", item });
    else {
      const ev = events.find((e) => `event:${e.id}` === item.id);
      if (ev) setSelection({ mode: "edit", event: ev });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-16">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-[520px] w-full rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-3xl p-10 text-center max-w-lg mx-auto border border-red-500/20">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="text-lg font-bold mb-1.5">Couldn&apos;t load Calendar</h2>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <button onClick={() => void reload()} className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold hover:-translate-y-0.5 transition-transform">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  const VIEWS: { id: View; label: string }[] = [
    { id: "month", label: "Month" }, { id: "week", label: "Week" }, { id: "agenda", label: "Agenda" },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600 flex items-center gap-2.5">
            <CalendarDays className="h-8 w-8 text-primary" /> Calendar
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Plan study blocks, track deadlines & exams — drag anything to reschedule.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl bg-muted/40 p-1 border border-border/50">
            {VIEWS.map((v) => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={cn("px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors", view === v.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {v.label}
              </button>
            ))}
          </div>
          <button onClick={() => setSelection({ mode: "create", day: new Date() })}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
            <Plus className="h-4 w-4" /> Add block
          </button>
        </div>
      </div>

      {/* Exam countdown */}
      <ExamCountdown onSelect={(ev) => setSelection({ mode: "edit", event: ev })} />

      {/* Templates bar */}
      {templates.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Templates</span>
          {templates.map((t) => {
            const c = colorTokens(t.color);
            return (
              <span key={t.id} className={cn("group inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-semibold border", c.chip, c.ring)}>
                <button onClick={() => setSelection({ mode: "create", day: new Date(), template: t })}>{t.name} · {t.duration_minutes}m</button>
                <button onClick={() => void deleteTemplate(t.id)} className="h-4 w-4 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-foreground/10 transition-all" title="Delete template"><X className="h-3 w-3" /></button>
              </span>
            );
          })}
        </div>
      )}

      {/* Navigation row (month/week) */}
      {view !== "agenda" && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{titleFor(view, cursor)}</h2>
          <div className="flex items-center gap-1.5">
            <button onClick={() => move(-1)} className="h-9 w-9 rounded-xl border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setCursor(new Date())} className="px-3 h-9 rounded-xl border border-border/60 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors">Today</button>
            <button onClick={() => move(1)} className="h-9 w-9 rounded-xl border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* View */}
      {view === "month" && (
        <MonthView cursor={cursor} items={items} focusByDate={focusByDate}
          onAddOnDay={(day) => setSelection({ mode: "create", day })} onSelectItem={selectItem} onDropItem={onDropItem} />
      )}
      {view === "week" && (
        <WeekView cursor={cursor} items={items} focusByDate={focusByDate}
          onAddOnDay={(day) => setSelection({ mode: "create", day })} onSelectItem={selectItem} onDropItem={onDropItem} />
      )}
      {view === "agenda" && <AgendaView items={items} onSelectItem={selectItem} />}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Exam / High task</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Study block</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Focus session</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Medium task</span>
      </div>

      <CalendarDialog selection={selection} onClose={() => setSelection(null)} />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <CalendarProvider>
      <CalendarInner />
    </CalendarProvider>
  );
}
