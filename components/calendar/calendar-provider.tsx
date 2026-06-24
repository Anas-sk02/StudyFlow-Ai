"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { toast } from "sonner";
import { createClient } from "@/supabase/client";
import { localDateKey, type CalendarItem } from "@/lib/calendar";
import type {
  StudyTask, StudyEvent, StudyBlockTemplate, FocusSession, EventKind,
} from "@/lib/types";

const PRIORITY_COLOR: Record<string, string> = { high: "rose", medium: "amber", low: "sky" };

export interface NewEventInput {
  title: string;
  subject: string | null;
  kind: EventKind;
  start_at: string;
  end_at: string;
  notes: string | null;
  color: string;
  task_id: string | null;
}

interface CalendarContextValue {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;

  items: CalendarItem[];
  tasks: StudyTask[];
  events: StudyEvent[];
  templates: StudyBlockTemplate[];
  focusByDate: Map<string, number>; // local date key → focus minutes

  createEvent: (input: NewEventInput) => Promise<void>;
  updateEvent: (id: string, patch: Partial<NewEventInput>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  rescheduleItem: (item: CalendarItem, newDay: Date) => Promise<void>;

  createTemplate: (input: Omit<StudyBlockTemplate, "id" | "user_id" | "created_at">) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function useCalendar(): CalendarContextValue {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error("useCalendar must be used within <CalendarProvider>");
  return ctx;
}

function withDateOf(day: Date, time: Date): Date {
  const d = new Date(day);
  d.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), 0);
  return d;
}

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [events, setEvents] = useState<StudyEvent[]>([]);
  const [templates, setTemplates] = useState<StudyBlockTemplate[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [focusByDate, setFocusByDate] = useState<Map<string, number>>(new Map());

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("You must be signed in."); setLoading(false); return; }
      setUserId(user.id);

      const since = new Date();
      since.setDate(since.getDate() - 120);
      const sinceKey = localDateKey(since);

      const [tasksRes, eventsRes, dailyRes, sessRes, tmplRes] = await Promise.all([
        supabase.from("study_tasks").select("*").eq("user_id", user.id).not("deadline", "is", null),
        supabase.from("study_events").select("*").eq("user_id", user.id).gte("start_at", since.toISOString()),
        supabase.from("focus_daily_stats").select("date, focus_minutes").eq("user_id", user.id).gte("date", sinceKey),
        supabase.from("focus_sessions").select("*").eq("user_id", user.id).eq("mode", "focus").eq("completed", true).gte("started_at", since.toISOString()).order("started_at", { ascending: false }).limit(200),
        supabase.from("study_block_templates").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (eventsRes.error) throw eventsRes.error;

      setTasks((tasksRes.data ?? []) as StudyTask[]);
      setEvents((eventsRes.data ?? []) as StudyEvent[]);
      setTemplates((tmplRes.data ?? []) as StudyBlockTemplate[]);
      setFocusSessions((sessRes.data ?? []) as FocusSession[]);

      const fmap = new Map<string, number>();
      for (const row of (dailyRes.data ?? []) as { date: string; focus_minutes: number }[]) {
        fmap.set(row.date, row.focus_minutes);
      }
      setFocusByDate(fmap);
    } catch (e) {
      console.error(e);
      setError("Failed to load your calendar. Make sure database-calendar.sql has been run.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load (matches app-wide pattern)
  useEffect(() => { void loadAll(); }, [loadAll]);

  // --------------------------------------------------------------- items
  const items = useMemo<CalendarItem[]>(() => {
    const out: CalendarItem[] = [];

    for (const t of tasks) {
      if (!t.deadline) continue;
      const start = new Date(`${t.deadline}T${t.due_time ?? "00:00:00"}`);
      out.push({
        id: `task:${t.id}`,
        type: "task",
        title: t.title,
        subject: t.subject,
        start,
        end: null,
        allDay: !t.due_time,
        color: PRIORITY_COLOR[t.priority] ?? "indigo",
        kind: null,
        draggable: true,
        done: t.status === "done",
      });
    }

    for (const ev of events) {
      out.push({
        id: `event:${ev.id}`,
        type: "event",
        title: ev.title,
        subject: ev.subject,
        start: new Date(ev.start_at),
        end: new Date(ev.end_at),
        allDay: false,
        color: ev.color,
        kind: ev.kind,
        draggable: true,
      });
    }

    for (const s of focusSessions) {
      const start = new Date(s.started_at);
      out.push({
        id: `focus:${s.id}`,
        type: "focus",
        title: `Focus · ${s.duration_minutes}m`,
        subject: s.task_label,
        start,
        end: s.ended_at ? new Date(s.ended_at) : null,
        allDay: false,
        color: "emerald",
        kind: null,
        draggable: false,
      });
    }

    return out;
  }, [tasks, events, focusSessions]);

  // --------------------------------------------------------------- mutations
  const createEvent = useCallback(async (input: NewEventInput) => {
    if (!userId) return;
    const { data, error: err } = await supabase
      .from("study_events").insert({ user_id: userId, ...input }).select("*").single();
    if (err || !data) { toast.error("Couldn't create the study block."); return; }
    setEvents((prev) => [...prev, data as StudyEvent]);
    toast.success("Study block added.");
  }, [supabase, userId]);

  const updateEvent = useCallback(async (id: string, patch: Partial<NewEventInput>) => {
    const { data, error: err } = await supabase
      .from("study_events").update(patch).eq("id", id).select("*").single();
    if (err || !data) { toast.error("Couldn't update the study block."); return; }
    setEvents((prev) => prev.map((e) => (e.id === id ? (data as StudyEvent) : e)));
  }, [supabase]);

  const deleteEvent = useCallback(async (id: string) => {
    const { error: err } = await supabase.from("study_events").delete().eq("id", id);
    if (err) { toast.error("Couldn't delete the study block."); return; }
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast.success("Study block removed.");
  }, [supabase]);

  const rescheduleItem = useCallback(async (item: CalendarItem, newDay: Date) => {
    if (!item.draggable) return;
    const [, rawId] = item.id.split(":");

    if (item.type === "task") {
      const key = localDateKey(newDay);
      const { error: err } = await supabase.from("study_tasks").update({ deadline: key }).eq("id", rawId);
      if (err) { toast.error("Couldn't reschedule the task."); return; }
      setTasks((prev) => prev.map((t) => (t.id === rawId ? { ...t, deadline: key } : t)));
      toast.success(`"${item.title}" moved to ${newDay.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`);
      return;
    }

    if (item.type === "event") {
      const ev = events.find((e) => e.id === rawId);
      if (!ev) return;
      const oldStart = new Date(ev.start_at);
      const oldEnd = new Date(ev.end_at);
      const duration = oldEnd.getTime() - oldStart.getTime();
      const newStart = withDateOf(newDay, oldStart);
      const newEnd = new Date(newStart.getTime() + duration);
      await updateEvent(rawId, { start_at: newStart.toISOString(), end_at: newEnd.toISOString() });
      toast.success(`"${item.title}" moved to ${newDay.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`);
    }
  }, [supabase, events, updateEvent]);

  const createTemplate = useCallback(async (input: Omit<StudyBlockTemplate, "id" | "user_id" | "created_at">) => {
    if (!userId) return;
    const { data, error: err } = await supabase
      .from("study_block_templates").insert({ user_id: userId, ...input }).select("*").single();
    if (err || !data) { toast.error("Couldn't save the template."); return; }
    setTemplates((prev) => [...prev, data as StudyBlockTemplate]);
    toast.success("Template saved.");
  }, [supabase, userId]);

  const deleteTemplate = useCallback(async (id: string) => {
    const { error: err } = await supabase.from("study_block_templates").delete().eq("id", id);
    if (err) { toast.error("Couldn't delete the template."); return; }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, [supabase]);

  const value: CalendarContextValue = {
    loading, error, reload: loadAll,
    items, tasks, events, templates, focusByDate,
    createEvent, updateEvent, deleteEvent, rescheduleItem,
    createTemplate, deleteTemplate,
  };

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}
