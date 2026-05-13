import { Activity, Flame, Target, TrendingUp, Calendar, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/supabase/server";
import type { StudyTask } from "@/lib/types";

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch real data
  const { data: tasks } = await supabase
    .from("study_tasks")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

  const typedTasks = (tasks || []) as StudyTask[];

  const completed = typedTasks.filter(t => t.status === "done");
  const inProgress = typedTasks.filter(t => t.status === "in_progress");
  const todo = typedTasks.filter(t => t.status === "todo");

  const completionRate = typedTasks.length > 0 
    ? Math.round((completed.length / typedTasks.length) * 100) 
    : 0;

  const cards = [
    { label: "Total Tasks", value: typedTasks.length, icon: Target, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "In Progress", value: inProgress.length, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Completion Rate", value: `${completionRate}%`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Completed", value: completed.length, icon: CheckCircle2, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  ];

  const recentTasks = typedTasks.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "there"}! Here is what is happening today.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-bold tracking-tight">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <section className="glass rounded-2xl p-6 lg:col-span-2 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Today's Focus & Recent Tasks</h2>
            <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">Realtime</span>
          </div>
          
          {recentTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-xl border-border">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No tasks yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first task in the planner to see it here.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-emerald-500' : task.status === 'in_progress' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.subject} · {task.priority} priority</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium px-2 py-1 bg-muted rounded-md">{task.status.replace("_", " ")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="glass rounded-2xl p-6 flex flex-col h-full">
          <h2 className="text-lg font-semibold mb-6">Smart Recommendations</h2>
          <div className="flex-1 space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-sm font-medium mb-1 flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Keep the momentum
              </p>
              <p className="text-xs text-muted-foreground">You have {todo.length} tasks pending. Try focusing on the high priority ones first using the Pomodoro technique.</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-sm font-medium mb-1 flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                Join a Study Room
              </p>
              <p className="text-xs text-muted-foreground">Studying with others can boost productivity by 40%. Check active rooms to join a focused session.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
