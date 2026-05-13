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
  CalendarDays
} from "lucide-react";
import { createClient } from "@/supabase/client";
import type { StudyTask } from "@/lib/types";
import { createTaskAction } from "./actions";
import { cn } from "@/lib/utils";

export default function TasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("study_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error(error.message);
        return;
      }
      setTasks((data || []) as StudyTask[]);
    };
    void load();
  }, [supabase]);

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

  async function addTask(formData: FormData): Promise<void> {
    const result = await createTaskAction(formData);
    
    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.data) {
      setTasks((old) => [result.data as StudyTask, ...old]);
      toast.success("Task created.");
      setIsAdding(false);
    }
  }

  async function toggleDone(task: StudyTask): Promise<void> {
    const next = task.status === "done" ? "todo" : "done";
    const { error } = await supabase.from("study_tasks").update({ status: next }).eq("id", task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTasks((old) => old.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    toast.success(next === "done" ? "Task completed!" : "Task restored.");
  }

  async function deleteTask(id: string): Promise<void> {
    const { error } = await supabase.from("study_tasks").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTasks((old) => old.filter((t) => t.id !== id));
    toast.success("Task deleted.");
  }

  async function rescheduleTask(id: string, days: number): Promise<void> {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    const deadline = newDate.toISOString().split('T')[0];
    
    const { error } = await supabase.from("study_tasks").update({ deadline }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTasks((old) => old.map(t => t.id === id ? { ...t, deadline } : t));
    toast.success(`Rescheduled to ${newDate.toLocaleDateString()}`);
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
                activeTab === "active" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Active
            </button>
            <button 
              onClick={() => setActiveTab("completed")}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === "completed" ? "bg-background text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Done
            </button>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
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
            className="w-full h-14 rounded-2xl border border-border/60 bg-card/50 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground shadow-sm"
            placeholder="Search tasks, subjects, or notes..."
          />
        </div>
        <div className="lg:col-span-4">
          <div className="relative group h-14">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full h-full rounded-2xl border border-border/60 bg-card/50 pl-12 pr-10 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none shadow-sm font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="high">🔥 High Priority</option>
              <option value="medium">⚡ Medium Priority</option>
              <option value="low">🌱 Low Priority</option>
              <option value="overdue">⏰ Overdue Only</option>
              <option value="today">📅 Due Today</option>
              <option value="upcoming">🚀 Upcoming</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <ChevronRight className="h-4 w-4 rotate-90" />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="glass rounded-3xl p-8 border-2 border-primary/20 shadow-2xl shadow-primary/5"
          >
            <form action={addTask} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-primary" /> Task Name
                  </label>
                  <input name="title" required placeholder="e.g. Finish Math Assignment" className="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 focus:bg-background transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" /> Subject
                  </label>
                  <input name="subject" required placeholder="e.g. Calculus" className="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 focus:bg-background transition-all outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" /> Due Date
                  </label>
                  <input name="deadline" type="date" className="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 focus:bg-background transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Time (Optional)
                  </label>
                  <input name="due_time" type="time" className="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 focus:bg-background transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-primary" /> Priority
                  </label>
                  <select name="priority" className="w-full h-12 rounded-xl border border-border/60 bg-background/50 px-4 focus:bg-background transition-all outline-none appearance-none">
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-xl text-sm font-bold hover:bg-muted/50 transition-all">Cancel</button>
                <button type="submit" className="px-8 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
                  Save Task
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
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
                    onToggle={() => toggleDone(task)}
                    onDelete={() => deleteTask(task.id)}
                    onReschedule={(days) => rescheduleTask(task.id, days)}
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
  onToggle, 
  onDelete,
  onReschedule
}: { 
  task: StudyTask, 
  isOverdue: boolean,
  onToggle: () => void,
  onDelete: () => void,
  onReschedule: (days: number) => void
}) {
  const x = useMotionValue(0);
  const background = useTransform(x, [-100, 0, 100], ["#ef4444", "rgba(0,0,0,0)", "#10b981"]);
  const opacity = useTransform(x, [-100, -50, 0, 50, 100], [1, 0.5, 0, 0.5, 1]);

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
        style={{ background }}
        className="absolute inset-0 flex items-center justify-between px-8 text-white font-black uppercase tracking-widest text-xs"
      >
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" /> Delete
        </div>
        <div className="flex items-center gap-2">
          Complete <CheckCircle2 className="h-5 w-5" />
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
          "glass relative z-10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-grab active:cursor-grabbing transition-colors duration-500",
          task.status === "done" && "bg-muted/30 opacity-70",
          isOverdue && "border-red-500/30 bg-red-500/[0.02]"
        )}
      >
        <div className="flex items-start gap-5 flex-1 min-w-0">
          <button 
            onClick={onToggle}
            className={cn(
              "h-10 w-10 rounded-2xl border-2 flex items-center justify-center shrink-0 transition-all duration-300",
              task.status === "done" 
                ? "bg-emerald-500 border-emerald-500 text-white rotate-[360deg]" 
                : isOverdue 
                  ? "border-red-500/50 bg-red-500/5 text-red-500" 
                  : "border-border/60 hover:border-primary hover:bg-primary/5"
            )}
          >
            {task.status === "done" ? <CheckCircle2 className="h-6 w-6" /> : isOverdue ? <AlertCircle className="h-6 w-6" /> : <div className="h-2 w-2 rounded-full bg-border group-hover:bg-primary transition-colors" />}
          </button>
          
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                "text-xl font-bold truncate transition-all duration-500",
                task.status === "done" && "line-through text-muted-foreground decoration-2",
                isOverdue && "text-red-600"
              )}>
                {task.title}
              </h3>
              {isOverdue && (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-[10px] font-black text-white uppercase tracking-tighter animate-pulse">
                  Overdue
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <Tag className="h-3 w-3" /> {task.subject}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Clock className="h-3.5 w-3.5" /> {task.estimated_hours}h
              </span>
              {task.deadline && (
                <span className={cn(
                  "flex items-center gap-1.5 text-xs font-bold",
                  isOverdue ? "text-red-500" : "text-muted-foreground"
                )}>
                  <CalendarDays className="h-3.5 w-3.5" /> 
                  {new Date(task.deadline).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                  {task.due_time && ` • ${task.due_time}`}
                </span>
              )}
              <span className={cn(
                "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest",
                task.priority === "high" ? "bg-red-500/10 text-red-500" : 
                task.priority === "medium" ? "bg-amber-500/10 text-amber-500" : 
                "bg-blue-500/10 text-blue-500"
              )}>
                {task.priority}
              </span>
            </div>
          </div>
        </div>

        {/* Action Suggestions / Reschedule */}
        <div className="flex items-center gap-3">
          {isOverdue && (
            <div className="flex flex-col gap-2 md:flex-row items-center">
              <span className="text-[10px] font-bold text-muted-foreground hidden lg:block uppercase tracking-widest">Reschedule?</span>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => onReschedule(1)}
                  className="px-4 py-2 rounded-xl bg-muted/80 text-[10px] font-bold hover:bg-muted transition-all uppercase tracking-wider"
                >
                  Tomorrow
                </button>
                <button 
                  onClick={() => onReschedule(7)}
                  className="px-4 py-2 rounded-xl bg-muted/80 text-[10px] font-bold hover:bg-muted transition-all uppercase tracking-wider"
                >
                  Next Week
                </button>
              </div>
            </div>
          )}
          
          <button 
            onClick={onDelete}
            className="p-3 rounded-2xl border border-border/40 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 hidden md:block"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
