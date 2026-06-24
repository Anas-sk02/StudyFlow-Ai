import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addDays, differenceInCalendarDays, isSameDay,
} from "date-fns";
import type { EventKind } from "@/lib/types";

// ---------------------------------------------------------------------
//  Colors — full static class strings so Tailwind keeps them at build time
// ---------------------------------------------------------------------
export interface ColorTokens {
  dot: string;   // small indicator
  bar: string;   // solid accent (left border / fill)
  chip: string;  // pill background + text
  ring: string;  // border tint
  text: string;
}

export const EVENT_COLORS: Record<string, ColorTokens> = {
  indigo:  { dot: "bg-indigo-500",  bar: "bg-indigo-500",  chip: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",  ring: "border-indigo-500/30",  text: "text-indigo-500" },
  violet:  { dot: "bg-violet-500",  bar: "bg-violet-500",  chip: "bg-violet-500/10 text-violet-600 dark:text-violet-300",  ring: "border-violet-500/30",  text: "text-violet-500" },
  emerald: { dot: "bg-emerald-500", bar: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", ring: "border-emerald-500/30", text: "text-emerald-500" },
  amber:   { dot: "bg-amber-500",   bar: "bg-amber-500",   chip: "bg-amber-500/10 text-amber-600 dark:text-amber-300",   ring: "border-amber-500/30",   text: "text-amber-500" },
  rose:    { dot: "bg-rose-500",    bar: "bg-rose-500",    chip: "bg-rose-500/10 text-rose-600 dark:text-rose-300",    ring: "border-rose-500/30",    text: "text-rose-500" },
  sky:     { dot: "bg-sky-500",     bar: "bg-sky-500",     chip: "bg-sky-500/10 text-sky-600 dark:text-sky-300",     ring: "border-sky-500/30",     text: "text-sky-500" },
  slate:   { dot: "bg-slate-500",   bar: "bg-slate-500",   chip: "bg-slate-500/10 text-slate-600 dark:text-slate-300",   ring: "border-slate-500/30",   text: "text-slate-400" },
};

export const COLOR_KEYS = Object.keys(EVENT_COLORS);

export function colorTokens(color: string): ColorTokens {
  return EVENT_COLORS[color] ?? EVENT_COLORS.indigo;
}

// ---------------------------------------------------------------------
//  Event kinds
// ---------------------------------------------------------------------
export const KIND_META: Record<EventKind, { label: string; color: string; icon: string }> = {
  study:    { label: "Study",    color: "indigo",  icon: "BookOpen" },
  exam:     { label: "Exam",     color: "rose",    icon: "GraduationCap" },
  class:    { label: "Class",    color: "sky",     icon: "Presentation" },
  revision: { label: "Revision", color: "amber",   icon: "Repeat" },
  break:    { label: "Break",    color: "emerald", icon: "Coffee" },
};

export const KIND_KEYS = Object.keys(KIND_META) as EventKind[];

// ---------------------------------------------------------------------
//  Unified calendar item (tasks · study events · focus sessions)
// ---------------------------------------------------------------------
export type CalendarItemType = "task" | "event" | "focus";

export interface CalendarItem {
  id: string;
  type: CalendarItemType;
  title: string;
  subject: string | null;
  start: Date;
  end: Date | null;
  allDay: boolean;
  color: string;
  kind: EventKind | null;
  draggable: boolean;
  done?: boolean;
}

// ---------------------------------------------------------------------
//  Grid builders
// ---------------------------------------------------------------------
/** 6×7 matrix of days covering the month that `cursor` falls in (week starts Monday). */
export function buildMonthMatrix(cursor: Date): Date[][] {
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/** 7 days of the week that `cursor` falls in (Monday → Sunday). */
export function weekDays(cursor: Date): Date[] {
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------------------------------------------------------------------
//  Misc helpers
// ---------------------------------------------------------------------
/** Local YYYY-MM-DD key (matches the convention used across the app). */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Human countdown label for an exam / future event. */
export function countdownLabel(target: Date, from: Date = new Date()): string {
  const days = differenceInCalendarDays(target, from);
  if (days < 0) return "Past";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `in ${days} days`;
  if (days < 14) return "in 1 week";
  if (days < 30) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} mo`;
}

export function itemsOnDay(items: CalendarItem[], day: Date): CalendarItem[] {
  return items
    .filter((it) => isSameDay(it.start, day))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return a.start.getTime() - b.start.getTime();
    });
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
