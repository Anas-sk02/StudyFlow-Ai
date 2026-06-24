"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, Trash2, Save, BookmarkPlus, Timer, ListTodo, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COLOR_KEYS, EVENT_COLORS, KIND_KEYS, KIND_META, colorTokens, formatTime, localDateKey,
} from "@/lib/calendar";
import type { StudyEvent, EventKind, StudyBlockTemplate } from "@/lib/types";
import type { CalendarItem } from "@/lib/calendar";
import { useCalendar } from "./calendar-provider";

export type Selection =
  | { mode: "create"; day: Date; template?: StudyBlockTemplate }
  | { mode: "edit"; event: StudyEvent }
  | { mode: "task"; item: CalendarItem }
  | { mode: "focus"; item: CalendarItem };

const pad = (n: number) => String(n).padStart(2, "0");
const timeOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const minutesBetween = (a: string, b: string) => {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return (bh * 60 + bm) - (ah * 60 + am);
};
const addMinutesToTime = (t: string, mins: number) => {
  const [h, m] = t.split(":").map(Number);
  const total = ((h * 60 + m + mins) % 1440 + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

export function CalendarDialog({ selection, onClose }: { selection: Selection | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {selection && <DialogInner key="dialog" selection={selection} onClose={onClose} />}
    </AnimatePresence>
  );
}

function DialogInner({ selection, onClose }: { selection: Selection; onClose: () => void }) {
  const { createEvent, updateEvent, deleteEvent, templates, createTemplate, tasks } = useCalendar();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 p-6 shadow-2xl"
      >
        {selection.mode === "task" ? <TaskDetail item={selection.item} onClose={onClose} />
          : selection.mode === "focus" ? <FocusDetail item={selection.item} onClose={onClose} />
          : <EventForm selection={selection} onClose={onClose}
              createEvent={createEvent} updateEvent={updateEvent} deleteEvent={deleteEvent}
              templates={templates} createTemplate={createTemplate} tasks={tasks} />}
      </motion.div>
    </motion.div>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-bold">{title}</h2>
      <button onClick={onClose} className="h-8 w-8 rounded-xl border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
    </div>
  );
}

const inputCls = "w-full h-11 rounded-xl border border-border/60 bg-background/50 px-3 text-sm outline-none focus:border-primary transition-colors dark:bg-muted/20";
const labelCls = "text-xs font-bold text-muted-foreground mb-1.5 block";

function EventForm({ selection, onClose, createEvent, updateEvent, deleteEvent, templates, createTemplate, tasks }: {
  selection: { mode: "create"; day: Date } | { mode: "edit"; event: StudyEvent };
  onClose: () => void;
  createEvent: ReturnType<typeof useCalendar>["createEvent"];
  updateEvent: ReturnType<typeof useCalendar>["updateEvent"];
  deleteEvent: ReturnType<typeof useCalendar>["deleteEvent"];
  templates: StudyBlockTemplate[];
  createTemplate: ReturnType<typeof useCalendar>["createTemplate"];
  tasks: ReturnType<typeof useCalendar>["tasks"];
}) {
  const editing = selection.mode === "edit";
  const ev = editing ? selection.event : null;

  const init = useMemo(() => {
    if (ev) {
      const s = new Date(ev.start_at); const e = new Date(ev.end_at);
      return { title: ev.title, subject: ev.subject ?? "", kind: ev.kind, date: localDateKey(s), start: timeOf(s), end: timeOf(e), color: ev.color, notes: ev.notes ?? "", taskId: ev.task_id ?? "" };
    }
    const create = selection as { day: Date; template?: StudyBlockTemplate };
    const t = create.template;
    return {
      title: t?.name ?? "",
      subject: t?.subject ?? "",
      kind: t?.kind ?? ("study" as EventKind),
      date: localDateKey(create.day),
      start: "09:00",
      end: t ? addMinutesToTime("09:00", t.duration_minutes) : "10:00",
      color: t?.color ?? "indigo",
      notes: "",
      taskId: "",
    };
  }, [ev, selection]);

  const [title, setTitle] = useState(init.title);
  const [subject, setSubject] = useState(init.subject);
  const [kind, setKind] = useState<EventKind>(init.kind);
  const [date, setDate] = useState(init.date);
  const [start, setStart] = useState(init.start);
  const [end, setEnd] = useState(init.end);
  const [color, setColor] = useState(init.color);
  const [notes, setNotes] = useState(init.notes);
  const [taskId, setTaskId] = useState(init.taskId);
  const [saving, setSaving] = useState(false);

  const applyTemplate = (t: StudyBlockTemplate) => {
    setSubject(t.subject ?? "");
    setKind(t.kind);
    setColor(t.color);
    if (!title) setTitle(t.name);
    setEnd(addMinutesToTime(start, t.duration_minutes));
  };

  const onSelectKind = (k: EventKind) => { setKind(k); setColor(KIND_META[k].color); };

  const submit = async () => {
    if (!title.trim()) return;
    if (minutesBetween(start, end) <= 0) { setEnd(addMinutesToTime(start, 60)); return; }
    setSaving(true);
    const start_at = new Date(`${date}T${start}:00`).toISOString();
    const end_at = new Date(`${date}T${end}:00`).toISOString();
    const payload = { title: title.trim(), subject: subject.trim() || null, kind, start_at, end_at, notes: notes.trim() || null, color, task_id: taskId || null };
    if (editing && ev) await updateEvent(ev.id, payload);
    else await createEvent(payload);
    setSaving(false);
    onClose();
  };

  const saveAsTemplate = () => {
    const dur = Math.max(15, minutesBetween(start, end));
    void createTemplate({ name: title.trim() || subject.trim() || KIND_META[kind].label, subject: subject.trim() || null, duration_minutes: dur, color, kind });
  };

  return (
    <>
      <Header title={editing ? "Edit study block" : "New study block"} onClose={onClose} />

      {templates.length > 0 && (
        <div className="mb-4">
          <span className={labelCls}>Quick templates</span>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => {
              const c = colorTokens(t.color);
              return (
                <button key={t.id} onClick={() => applyTemplate(t)} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95", c.chip, c.ring)}>
                  {t.name} · {t.duration_minutes}m
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className={labelCls}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Revise Thermodynamics" className={inputCls} autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Type</label>
            <select value={kind} onChange={(e) => onSelectKind(e.target.value as EventKind)} className={cn(inputCls, "appearance-none")}>
              {KIND_KEYS.map((k) => <option key={k} value={k} className="dark:bg-neutral-900">{KIND_META[k].label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Optional" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Start</label>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>End</label>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Color</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_KEYS.map((k) => (
              <button key={k} onClick={() => setColor(k)} className={cn("h-7 w-7 rounded-full transition-transform", EVENT_COLORS[k].bar, color === k ? "ring-2 ring-offset-2 ring-offset-background ring-foreground/40 scale-110" : "hover:scale-110")} aria-label={k} />
            ))}
          </div>
        </div>

        {tasks.length > 0 && (
          <div>
            <label className={labelCls}>Link a task (optional)</label>
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className={cn(inputCls, "appearance-none")}>
              <option value="" className="dark:bg-neutral-900">No task</option>
              {tasks.filter((t) => t.status !== "done").map((t) => <option key={t.id} value={t.id} className="dark:bg-neutral-900">{t.title}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional" className="w-full resize-none rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary transition-colors dark:bg-muted/20" />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/40">
        {editing && ev && (
          <button onClick={async () => { await deleteEvent(ev.id); onClose(); }} className="h-11 w-11 rounded-xl border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
        )}
        <button onClick={saveAsTemplate} className="inline-flex items-center gap-1.5 px-3 h-11 rounded-xl border border-border/60 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors" title="Save these settings as a reusable template">
          <BookmarkPlus className="h-4 w-4" /> Template
        </button>
        <div className="flex-1" />
        <button onClick={onClose} className="px-4 h-11 rounded-xl text-sm font-bold hover:bg-muted transition-colors">Cancel</button>
        <button onClick={submit} disabled={saving || !title.trim()} className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
          <Save className="h-4 w-4" /> {editing ? "Save" : "Add block"}
        </button>
      </div>
    </>
  );
}

function TaskDetail({ item, onClose }: { item: CalendarItem; onClose: () => void }) {
  const c = colorTokens(item.color);
  return (
    <>
      <Header title="Task" onClose={onClose} />
      <div className="flex items-start gap-3">
        <span className={cn("mt-1 h-3 w-3 rounded-full shrink-0", c.bar)} />
        <div className="min-w-0">
          <p className={cn("text-lg font-bold", item.done && "line-through text-muted-foreground")}>{item.title}</p>
          {item.subject && <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5"><ListTodo className="h-3.5 w-3.5" /> {item.subject}</p>}
          <p className="text-sm text-muted-foreground mt-2">
            {item.allDay ? "Due " : "Due at "}
            <span className="font-semibold text-foreground">
              {item.start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              {!item.allDay && ` · ${formatTime(item.start)}`}
            </span>
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-4 bg-muted/30 rounded-xl p-3">Tip: drag this task to another day on the calendar to reschedule it.</p>
      <div className="flex justify-end mt-5">
        <Link href="/dashboard/tasks" onClick={onClose} className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:-translate-y-0.5 transition-all">
          <ExternalLink className="h-4 w-4" /> Open in Planner
        </Link>
      </div>
    </>
  );
}

function FocusDetail({ item, onClose }: { item: CalendarItem; onClose: () => void }) {
  return (
    <>
      <Header title="Focus session" onClose={onClose} />
      <div className="flex items-start gap-3">
        <span className="mt-1 h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0"><Timer className="h-4.5 w-4.5" /></span>
        <div className="min-w-0">
          <p className="text-lg font-bold">{item.title}</p>
          {item.subject && <p className="text-sm text-muted-foreground mt-0.5">On {item.subject}</p>}
          <p className="text-sm text-muted-foreground mt-2">
            <span className="font-semibold text-foreground">{item.start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
            {" · "}{formatTime(item.start)}{item.end && ` – ${formatTime(item.end)}`}
          </p>
        </div>
      </div>
      <div className="flex justify-end mt-5">
        <button onClick={onClose} className="px-4 h-11 rounded-xl text-sm font-bold hover:bg-muted transition-colors">Close</button>
      </div>
    </>
  );
}
