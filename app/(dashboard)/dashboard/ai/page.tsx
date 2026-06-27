"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Calendar, BrainCircuit, Target, ListTodo, Activity } from "lucide-react";

type Timetable = { day: string; slots: Array<{ subject: string; task: string; hours: number }> };

export default function AIPage() {
  const [schedule, setSchedule] = useState<Timetable[]>([]);
  const [breakdown, setBreakdown] = useState<string[]>([]);
  const [summary, setSummary] = useState<{ insights: string; motivation: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  async function generateTimetable(formData: FormData) {
    setIsGenerating("timetable");
    const subjects = String(formData.get("subjects") || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const availableHours = Number(formData.get("hours") || 3);
    const examDates = String(formData.get("examDates") || "");

    try {
      const response = await fetch("/api/ai/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects, availableHours, examDates }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate timetable");
      }
      const data = await response.json();
      setSchedule(data.schedule || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate timetable");
    }
    setIsGenerating(null);
  }

  async function generateBreakdown(formData: FormData) {
    setIsGenerating("breakdown");
    const goal = String(formData.get("goal") || "");
    try {
      const response = await fetch("/api/ai/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate breakdown");
      }
      const data = await response.json();
      setBreakdown(data.tasks || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate breakdown");
    }
    setIsGenerating(null);
  }

  async function generateSummary() {
    setIsGenerating("summary");
    try {
      // Fetch real user analytics first
      const analyticsRes = await fetch("/api/analytics");
      let completedTasks = 0;
      let focusedHours = 0;
      let streak = 0;

      if (analyticsRes.ok) {
        const a = await analyticsRes.json();
        completedTasks = a.summary?.completed || 0;
        focusedHours = (a.summary?.focusMinutes || 0) / 60;
        streak = a.summary?.streakDays || 0;
      }

      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedTasks, focusedHours, streak }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate insights");
      }
      const data = await response.json();
      setSummary(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate insights");
    }
    setIsGenerating(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">AI Studio</h1>
        <p className="text-muted-foreground">Leverage artificial intelligence to optimize your learning workflow.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Timetable Generator */}
        <section className="glass rounded-3xl p-6 md:p-8 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-primary/10 transition-colors duration-500"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Smart Timetable</h2>
              <p className="text-sm text-muted-foreground">Generate an optimized study schedule based on exams.</p>
            </div>
          </div>
          
          <form action={generateTimetable} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Subjects (comma separated)</label>
              <input name="subjects" placeholder="e.g. Math, Physics, CS" className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-2.5 focus:bg-background transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground ml-1">Daily Hours</label>
                <input name="hours" type="number" defaultValue={3} min={1} max={12} className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-2.5 focus:bg-background transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground ml-1">Exam Dates</label>
                <input name="examDates" placeholder="Math:12/05" className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-2.5 focus:bg-background transition-colors" />
              </div>
            </div>
            <button disabled={isGenerating === "timetable"} className="w-full mt-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {isGenerating === "timetable" ? <span className="animate-spin"><BrainCircuit className="h-4 w-4" /></span> : <Sparkles className="h-4 w-4" />}
              {isGenerating === "timetable" ? "Generating..." : "Generate Timetable"}
            </button>
          </form>

          {schedule.length > 0 && (
            <div className="mt-6 space-y-3 pt-6 border-t border-border/50 animate-slide-up">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CheckListIcon /> Your Schedule</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {schedule.map((item) => (
                  <div key={item.day} className="rounded-xl border border-border/50 bg-background/30 p-4">
                    <p className="font-bold text-sm mb-2 text-primary">{item.day}</p>
                    <div className="space-y-2">
                      {item.slots.map((slot, index) => (
                        <div key={`${slot.subject}-${index}`} className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                          <div>
                            <span className="font-medium text-foreground">{slot.subject}</span>: <span className="text-muted-foreground">{slot.task}</span>
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-md bg-muted font-medium">{slot.hours}h</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="space-y-6">
          {/* Task Breakdown */}
          <section className="glass rounded-3xl p-6 md:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10 group-hover:bg-indigo-500/10 transition-colors duration-500"></div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Goal Breakdown</h2>
                <p className="text-sm text-muted-foreground">Turn big goals into actionable steps.</p>
              </div>
            </div>
            
            <form action={generateBreakdown} className="flex flex-col sm:flex-row gap-2.5">
              <input name="goal" placeholder="e.g. Prepare for OS final exam..." className="flex-1 w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm focus:bg-background focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors" />
              <button disabled={isGenerating === "breakdown"} className="shrink-0 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-70">
                {isGenerating === "breakdown" ? <BrainCircuit className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                {isGenerating === "breakdown" ? "Breaking down..." : "Break down"}
              </button>
            </form>

            {breakdown.length > 0 && (
              <div className="mt-5 space-y-2 animate-slide-up">
                {breakdown.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background/30 text-sm">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500 font-medium text-xs">{i+1}</div>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Productivity Summary */}
          <section className="glass rounded-3xl p-6 md:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 group-hover:bg-emerald-500/10 transition-colors duration-500"></div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Insights</h2>
                  <p className="text-sm text-muted-foreground">AI analysis of your performance.</p>
                </div>
              </div>
              <button 
                onClick={() => void generateSummary()} 
                disabled={isGenerating === "summary"}
                className="rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {isGenerating === "summary" ? "..." : <><Sparkles className="h-4 w-4" /> Analyze</>}
              </button>
            </div>
            
            {summary ? (
              <div className="space-y-4 animate-slide-up">
                <div className="p-4 rounded-xl border border-border/50 bg-background/30">
                  <p className="text-sm leading-relaxed">{summary.insights}</p>
                </div>
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex gap-3 items-start">
                  <Sparkles className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 leading-relaxed">{summary.motivation}</p>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground border border-dashed border-border/50 rounded-xl">
                Click analyze to generate insights based on your recent activity.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function CheckListIcon() {
  return <ListTodo className="h-4 w-4 text-primary" />;
}
