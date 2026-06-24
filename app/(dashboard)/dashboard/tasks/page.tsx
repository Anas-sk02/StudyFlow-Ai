"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { toast } from "sonner";
import { 
  Search, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  Tag, 
  ListTodo, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  CalendarClock,
  Trash2,
  Undo2,
  CalendarDays,
  Repeat,
  Edit3,
  ChevronDown,
  ListChecks,
  Hourglass,
  X,
  Plus as PlusIcon
} from "lucide-react";
import { createClient } from "@/supabase/client";
import type { StudyTask, Subtask } from "@/lib/types";
import { createTaskAction, updateTaskAction, toggleTaskAction, deleteTaskAction, rescheduleTaskAction } from "./actions";
import { cn } from "@/lib/utils";
import { TaskCardSkeleton } from "@/components/ui/skeleton";

export default function TasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const [tasksRes, subRes] = await Promise.all([
        supabase.from("study_tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("subtasks").select("*").order("position", { ascending: true }),
      ]);
      if (tasksRes.error) {
        toast.error(tasksRes.error.message);
        setLoading(false);
        return;
      }
      setTasks((tasksRes.data || []) as StudyTask[]);
      setSubtasks((subRes.data || []) as Subtask[]);
      setLoading(false);
    };
    void load();
  }, [supabase]);

  const showForm = isAdding || !!editingTask;

  const now = new Date();

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const isCompleted = task.status === "done";
      const taskDate = task.deadline ? new Date(task.deadline) : null;
      
      // Determine if overdue
      let isOverdue = false;
      if (!isCompleted && taskDate) {
        const deadline = new Date(task.deadline!);
        if (task.due_time) {
          const [h, m] = task.due_time.split(":");
          deadline.setHours(parseInt(h), parseInt(m), 0);
        } else {
          deadline.setHours(23, 59, 59);
        }
        isOverdue = deadline < now;
      }

      // Basic Tab Filtering
      if (activeTab === "active" && isCompleted) return false;
      if (activeTab === "completed" && !isCompleted) return false;

      // Search
      const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
                          task.subject.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      // Advanced Filters
      if (filter === "all") return true;
      if (filter === "high" || filter === "medium" || filter === "low") return task.priority === filter;
      if (filter === "overdue") return isOverdue;
      if (filter === "today") {
        return taskDate && taskDate.toDateString() === now.toDateString();
      }
      if (filter === "upcoming") {
        return taskDate && taskDate > now && taskDate.toDateString() !== now.toDateString();
      }

      return true;
    });
  }, [tasks, search, filter, activeTab]);

  const subjects = useMemo(() => Array.from(new Set(tasks.map(t => t.subject))), [tasks]);

  async function submitTask(formData: FormData): Promise<void> {
    if (editingTask) {
      const result = await updateTaskAction(editingTask.id, formData);
      if (result.error) { toast.error(result.error); return; }
      if (result.data) {
        const updated = result.data as StudyTask;
        setTasks((old) => old.map((t) => (t.id === editingTask.id ? updated : t)));
        toast.success("Task updated.");
        setEditingTask(null);
      }
      return;
    }
    const result = await createTaskAction(formData);
    if (result.error) { toast.error(result.error); return; }
    if (result.data) {
      setTasks((old) => [result.data as StudyTask, ...old]);
      toast.success("Task created.");
      setIsAdding(false);
    }
  }

  function startEdit(task: StudyTask): void {
    setIsAdding(false);
    setEditingTask(task);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleDone(task: StudyTask): Promise<void> {
    const next = task.status === "done" ? "todo" : "done";
    const result = await toggleTaskAction(task.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const payload = result.data as { completed_at: string | null; spawned?: StudyTask | null };
    setTasks((old) => {
      let updated = old.map((t) => (t.id === task.id ? { ...t, status: next as typeof task.status, completed_at: payload?.completed_at } : t));
      if (payload?.spawned) updated = [payload.spawned, ...updated];
      return updated;
    });
    toast.success(next === "done" ? (payload?.spawned ? "Completed! Next one scheduled 🔁" : "Task completed!") : "Task restored.");
  }

  // ----- subtasks (client-side, RLS-protected) -----
  async function addSubtask(taskId: string, title: string): Promise<void> {
    if (!userId || !title.trim()) return;
    const position = subtasks.filter((s) => s.task_id === taskId).length;
    const { data, error } = await supabase
      .from("subtasks").insert({ user_id: userId, task_id: taskId, title: title.trim(), position }).select("*").single();
    if (error) { toast.error("Couldn't add subtask."); return; }
    setSubtasks((old) => [...old, data as Subtask]);
  }

  async function toggleSubtask(s: Subtask): Promise<void> {
    setSubtasks((old) => old.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)));
    const { error } = await supabase.from("subtasks").update({ done: !s.done }).eq("id", s.id);
    if (error) {
      toast.error("Couldn't update subtask.");
      setSubtasks((old) => old.map((x) => (x.id === s.id ? { ...x, done: s.done } : x)));
    }
  }

  async function deleteSubtask(id: string): Promise<void> {
    setSubtasks((old) => old.filter((x) => x.id !== id));
    await supabase.from("subtasks").delete().eq("id", id);
  }

  async function deleteTask(id: string): Promise<void> {
    const result = await deleteTaskAction(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setTasks((old) => old.filter((t) => t.id !== id));
    toast.success("Task deleted.");
  }

  async function rescheduleTask(id: string, days: number): Promise<void> {
    const result = await rescheduleTaskAction(id, days);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const { deadline } = result.data as { deadline: string };
    setTasks((old) => old.map(t => t.id === id ? { ...t, deadline } : t));
    toast.success(`Rescheduled to ${new Date(deadline + "T00:00:00").toLocaleDateString()}`);
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">
            Study Planner
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Master your schedule, one task at a time.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-muted/50 p-1 rounded-2xl flex">
            <button 
              onClick={() => setActiveTab("active")}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === "active" ? "bg-background dark:bg-muted text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/5" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Active
            </button>
            <button 
              onClick={() => setActiveTab("completed")}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === "completed" ? "bg-background dark:bg-muted text-emerald-500 shadow-sm ring-1 ring-black/5 dark:ring-white/5" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Done
            </button>
          </div>
          <button
            onClick={() => { setEditingTask(null); setIsAdding((v) => !v); }}
            className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center hover:-translate-y-1 transition-all"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 rounded-2xl border border-border/60 bg-card/50 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground shadow-sm dark:bg-muted/40 dark:text-foreground dark:placeholder:text-muted-foreground/60"
            placeholder="Search tasks, subjects, or notes..."
          />
        </div>
        <div className="lg:col-span-4">
          <div className="relative group h-14">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full h-full rounded-2xl border border-border/60 bg-card/50 pl-12 pr-10 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none shadow-sm font-medium dark:bg-muted/40 dark:text-foreground"
            >
              <option value="all" className="dark:bg-neutral-900">All Priorities</option>
              <option value="high" className="dark:bg-neutral-900">🔥 High Priority</option>
              <option value="medium" className="dark:bg-neutral-900">⚡ Medium Priority</option>
              <option value="low" className="dark:bg-neutral-900">🌱 Low Priority</option>
              <option value="overdue" className="dark:bg-neutral-900">⏰ Overdue Only</option>
              <option value="today" className="dark:bg-neutral-900">📅 Due Today</option>
              <option value="upcoming" className="dark:bg-neutral-900">🚀 Upcoming</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <ChevronRight className="h-4 w-4 rotate-90" />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            key={editingTask?.id ?? "new"}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="glass rounded-3xl p-8 border-2 border-primary/20 shadow-2xl shadow-primary/5"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black">{editingTask ? "Edit Task" : "New Task"}</h3>
              <button type="button" onClick={() => { setIsAdding(false); setEditingTask(null); }} className="h-8 w-8 rounded-xl border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <form action={submitTask} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-primary" /> Task Name
                  </label>
                  <input name="title" required defaultValue={editingTask?.title ?? ""} placeholder="e.g. Finish Math Assignment" className="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 focus:bg-background dark:bg-muted/20 dark:focus:bg-muted/40 transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" /> Subject
                  </label>
                  <input name="subject" required defaultValue={editingTask?.subject ?? ""} placeholder="e.g. Calculus" className="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 focus:bg-background dark:bg-muted/20 dark:focus:bg-muted/40 transition-all outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" /> Due Date
                  </label>
                  <input name="deadline" type="date" defaultValue={editingTask?.deadline ?? ""} className="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 focus:bg-background dark:bg-muted/20 dark:focus:bg-muted/40 transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Time (Optional)
                  </label>
                  <input name="due_time" type="time" defaultValue={editingTask?.due_time?.slice(0, 5) ?? ""} className="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 focus:bg-background dark:bg-muted/20 dark:focus:bg-muted/40 transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-primary" /> Priority
                  </label>
                  <select name="priority" defaultValue={editingTask?.priority ?? "medium"} className="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 focus:bg-background dark:bg-muted/20 dark:focus:bg-muted/40 transition-all outline-none appearance-none">
                    <option value="low" className="dark:bg-neutral-900">Low Priority</option>
                    <option value="medium" className="dark:bg-neutral-900">Medium Priority</option>
                    <option value="high" className="dark:bg-neutral-900">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                    <Hourglass className="h-4 w-4 text-primary" /> Estimated Hours
                  </label>
                  <input name="estimated_hours" type="number" min={0.5} max={24} step={0.5} defaultValue={editingTask?.estimated_hours ?? 1} className="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 focus:bg-background dark:bg-muted/20 dark:focus:bg-muted/40 transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-primary" /> Repeat
                  </label>
                  <select name="recurrence" defaultValue={editingTask?.recurrence ?? "none"} className="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 focus:bg-background dark:bg-muted/20 dark:focus:bg-muted/40 transition-all outline-none appearance-none">
                    <option value="none" className="dark:bg-neutral-900">Does not repeat</option>
                    <option value="daily" className="dark:bg-neutral-900">Daily</option>
                    <option value="weekly" className="dark:bg-neutral-900">Weekly</option>
                    <option value="monthly" className="dark:bg-neutral-900">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <button type="button" onClick={() => { setIsAdding(false); setEditingTask(null); }} className="px-6 py-3 rounded-xl text-sm font-bold hover:bg-muted/50 transition-all">Cancel</button>
                <button type="submit" className="px-8 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
                  {editingTask ? "Save Changes" : "Save Task"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 glass rounded-[3rem] border-dashed border-2 border-border/40">
            <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarClock className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-2xl font-bold">No tasks found</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              {search || filter !== 'all' ? "Try adjusting your filters or search terms." : "You're all caught up for now! Time to relax or add a new goal."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((task) => {
                const isOverdue = !task.status.includes("done") && task.deadline && new Date(task.deadline) < now;
                
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isOverdue={!!isOverdue}
                    subtasks={subtasks.filter((s) => s.task_id === task.id)}
                    onToggle={() => toggleDone(task)}
                    onDelete={() => deleteTask(task.id)}
                    onReschedule={(days) => rescheduleTask(task.id, days)}
                    onEdit={() => startEdit(task)}
                    onAddSubtask={(title) => addSubtask(task.id, title)}
                    onToggleSubtask={toggleSubtask}
                    onDeleteSubtask={deleteSubtask}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  isOverdue,
  subtasks,
  onToggle,
  onDelete,
  onReschedule,
  onEdit,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: {
  task: StudyTask,
  isOverdue: boolean,
  subtasks: Subtask[],
  onToggle: () => void,
  onDelete: () => void,
  onReschedule: (days: number) => void,
  onEdit: () => void,
  onAddSubtask: (title: string) => void,
  onToggleSubtask: (s: Subtask) => void,
  onDeleteSubtask: (id: string) => void,
}) {
  const x = useMotionValue(0);
  const background = useTransform(x, [-100, 0, 100], ["#ef4444", "rgba(0,0,0,0)", "#10b981"]);
  const opacity = useTransform(x, [-100, -50, 0, 50, 100], [1, 0.5, 0, 0.5, 1]);

  const [showSubs, setShowSubs] = useState(false);
  const [newSub, setNewSub] = useState("");
  const doneCount = subtasks.filter((s) => s.done).length;
  const submitSub = () => { if (newSub.trim()) { onAddSubtask(newSub); setNewSub(""); } };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative group overflow-hidden rounded-3xl"
    >
      {/* Swipe Backgrounds */}
      <motion.div 
        style={{ background, opacity }}
        className="absolute inset-0 flex items-center justify-between px-6 md:px-8 text-white font-black uppercase tracking-widest text-[10px] md:text-xs pointer-events-none"
      >
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 md:h-5 w-5" /> <span className="hidden md:inline">Delete</span>
        </div>
        <div className="flex items-center gap-2 text-right">
          <span className="hidden md:inline">Complete</span> <CheckCircle2 className="h-4 w-4 md:h-5 w-5" />
        </div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x > 80) onToggle();
          else if (info.offset.x < -80) onDelete();
          x.set(0);
        }}
        style={{ x }}
        className={cn(
          "glass relative z-10 p-5 md:p-7 flex flex-col gap-4 cursor-grab active:cursor-grabbing transition-colors duration-500 dark:bg-zinc-900/90",
          task.status === "done" && "bg-muted/30 opacity-70",
          isOverdue && "border-red-500/30 bg-red-500/[0.02] dark:bg-red-500/10"
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-8 w-full">
        <div className="flex items-start gap-5 flex-1 min-w-0">
          <button 
            onClick={onToggle}
            className={cn(
              "h-10 w-10 rounded-2xl border-2 flex items-center justify-center shrink-0 transition-all duration-300",
              task.status === "done" 
                ? "bg-emerald-500 border-emerald-500 text-white rotate-[360deg]" 
                : isOverdue 
                  ? "border-red-500/50 bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400" 
                  : "border-border/60 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/20"
            )}
          >
            {task.status === "done" ? <CheckCircle2 className="h-6 w-6" /> : isOverdue ? <AlertCircle className="h-6 w-6" /> : <div className="h-2 w-2 rounded-full bg-border group-hover:bg-primary transition-colors" />}
          </button>
          
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                "text-lg md:text-xl font-bold truncate transition-all duration-500",
                task.status === "done" ? "line-through text-muted-foreground decoration-2" : "text-foreground",
                isOverdue && "text-red-500 dark:text-red-400"
              )}>
                {task.title}
              </h3>
              {isOverdue && (
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-red-500 text-[10px] font-black text-white uppercase tracking-tighter animate-pulse">
                  Overdue
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 text-primary dark:bg-primary/25 dark:text-indigo-300 text-[10px] md:text-xs font-bold uppercase tracking-wider border border-primary/10">
                <Tag className="h-3 w-3" /> {task.subject}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground font-semibold">
                <Clock className="h-3.5 w-3.5" /> {task.estimated_hours}h
              </span>
              {task.deadline && (
                <span className={cn(
                  "flex items-center gap-1.5 text-[10px] md:text-xs font-bold",
                  isOverdue ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
                )}>
                  <CalendarDays className="h-3.5 w-3.5" /> 
                  {new Date(task.deadline).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                  {task.due_time && ` • ${task.due_time.slice(0, 5)}`}
                </span>
              )}
              {task.recurrence && task.recurrence !== "none" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-violet-500/10 text-violet-600 border-violet-500/20 dark:bg-violet-500/30 dark:text-violet-300 dark:border-violet-500/40">
                  <Repeat className="h-3 w-3" /> {task.recurrence}
                </span>
              )}
              <span className={cn(
                "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                task.priority === "high" ? "bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-500/30 dark:text-red-300 dark:border-red-500/40" : 
                task.priority === "medium" ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/30 dark:text-amber-300 dark:border-amber-500/40" : 
                "bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-500/30 dark:text-blue-300 dark:border-blue-500/40"
              )}>
                {task.priority}
              </span>
            </div>
          </div>
        </div>

        {/* Action Suggestions / Reschedule */}
        <div className="flex items-center gap-3 shrink-0 ml-auto md:ml-0">
          {isOverdue && (
            <div className="flex flex-row items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground hidden lg:block uppercase tracking-widest">Reschedule?</span>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => onReschedule(1)}
                  className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-muted/80 dark:bg-muted/40 text-[10px] font-bold hover:bg-muted transition-all uppercase tracking-wider"
                >
                  Tomorrow
                </button>
                <button 
                  onClick={() => onReschedule(7)}
                  className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-muted/80 dark:bg-muted/40 text-[10px] font-bold hover:bg-muted transition-all uppercase tracking-wider"
                >
                  Next Week
                </button>
              </div>
            </div>
          )}
          
          <button
            onClick={onEdit}
            className="p-2.5 md:p-3 rounded-2xl border border-border/40 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all md:opacity-0 md:group-hover:opacity-100"
            title="Edit task"
          >
            <Edit3 className="h-4 w-4 md:h-5 w-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2.5 md:p-3 rounded-2xl border border-border/40 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all md:opacity-0 md:group-hover:opacity-100"
            title="Delete task"
          >
            <Trash2 className="h-4 w-4 md:h-5 w-5" />
          </button>
        </div>
        </div>

        {/* Subtasks */}
        <div onPointerDownCapture={(e) => e.stopPropagation()} className="border-t border-border/40 pt-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setShowSubs((v) => !v)}
              className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ListChecks className="h-3.5 w-3.5" />
              {subtasks.length > 0 ? `Subtasks ${doneCount}/${subtasks.length}` : "Add subtasks"}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showSubs && "rotate-180")} />
            </button>
            {subtasks.length > 0 && (
              <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(doneCount / subtasks.length) * 100}%` }} />
              </div>
            )}
          </div>

          <AnimatePresence initial={false}>
            {showSubs && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3 space-y-1.5">
                  {subtasks.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 group/sub">
                      <button
                        onClick={() => onToggleSubtask(s)}
                        className={cn("h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors", s.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-border/60 hover:border-primary")}
                      >
                        {s.done && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>
                      <span className={cn("text-sm flex-1 min-w-0 truncate", s.done && "line-through text-muted-foreground")}>{s.title}</span>
                      <button onClick={() => onDeleteSubtask(s.id)} className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground opacity-0 group-hover/sub:opacity-100 hover:text-red-500 transition-all"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={newSub}
                      onChange={(e) => setNewSub(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitSub(); } }}
                      placeholder="Add a subtask…"
                      className="flex-1 h-9 rounded-lg border border-border/60 bg-background/50 px-3 text-sm outline-none focus:border-primary dark:bg-muted/20"
                    />
                    <button onClick={submitSub} className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"><PlusIcon className="h-4 w-4" /></button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
