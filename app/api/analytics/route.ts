import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch weekly analytics: completed tasks grouped by day
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: completedTasks } = await supabase
      .from("study_tasks")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("status", "done")
      .not("completed_at", "is", null)
      .gte("completed_at", sevenDaysAgo.toISOString());

    // Build daily counts for the last 7 days
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyData: { day: string; hours: number; tasks: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayTasks = (completedTasks || []).filter((t) => {
        const completed = new Date(t.completed_at!);
        return completed >= d && completed < nextDay;
      });

      // Estimate hours from completed tasks (each task's estimated_hours)
      const taskCount = dayTasks.length;

      weeklyData.push({
        day: dayNames[d.getDay()],
        hours: taskCount > 0 ? Math.round(taskCount * 1.5 * 10) / 10 : 0, // ~1.5h per completed task
        tasks: taskCount,
      });
    }

    // Totals
    const { count: totalTasks } = await supabase
      .from("study_tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: completedCount } = await supabase
      .from("study_tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "done");

    const { count: inProgressCount } = await supabase
      .from("study_tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "in_progress");

    // Focus stats from user_stats
    const { data: stats } = await supabase
      .from("user_stats")
      .select("total_focus_minutes, streak_days, xp, level")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      weekly: weeklyData,
      summary: {
        totalTasks: totalTasks || 0,
        completed: completedCount || 0,
        inProgress: inProgressCount || 0,
        focusMinutes: stats?.total_focus_minutes || 0,
        streakDays: stats?.streak_days || 0,
        xp: stats?.xp || 0,
        level: stats?.level || 1,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 }
    );
  }
}
