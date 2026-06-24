"use client";

import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { BarChart3, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateKey, buildDailySeries } from "@/lib/focus";
import { useFocus } from "./focus-provider";

type Range = "7d" | "4w" | "6m";

const HEATMAP_WEEKS = 18;

export function FocusAnalytics() {
  const { dailyStats } = useFocus();
  const [range, setRange] = useState<Range>("7d");

  const statByDate = useMemo(() => new Map(dailyStats.map((d) => [d.date, d])), [dailyStats]);

  const chartData = useMemo(() => {
    if (range === "7d") {
      return buildDailySeries(dailyStats, 7).map((d) => ({
        label: new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }),
        hours: +(d.focus_minutes / 60).toFixed(2),
        sessions: d.sessions_completed,
      }));
    }
    if (range === "4w") {
      const days = buildDailySeries(dailyStats, 28);
      const weeks: { label: string; hours: number; sessions: number }[] = [];
      for (let w = 0; w < 4; w++) {
        const chunk = days.slice(w * 7, w * 7 + 7);
        weeks.push({
          label: `W${w + 1}`,
          hours: +(chunk.reduce((s, d) => s + d.focus_minutes, 0) / 60).toFixed(1),
          sessions: chunk.reduce((s, d) => s + d.sessions_completed, 0),
        });
      }
      return weeks;
    }
    // 6 months
    const months: { label: string; hours: number; sessions: number }[] = [];
    const cursor = new Date();
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() - 5);
    for (let m = 0; m < 6; m++) {
      const y = cursor.getFullYear(); const mo = cursor.getMonth();
      let mins = 0, sess = 0;
      dailyStats.forEach((d) => {
        const dd = new Date(d.date + "T00:00:00");
        if (dd.getFullYear() === y && dd.getMonth() === mo) { mins += d.focus_minutes; sess += d.sessions_completed; }
      });
      months.push({ label: cursor.toLocaleDateString(undefined, { month: "short" }), hours: +(mins / 60).toFixed(1), sessions: sess });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }, [dailyStats, range]);

  const totalHours = chartData.reduce((s, d) => s + d.hours, 0);
  const totalSessions = chartData.reduce((s, d) => s + d.sessions, 0);

  // ---- heatmap (GitHub-style, last 18 weeks) ----
  const heatmap = useMemo(() => {
    const cols: { date: string; minutes: number }[][] = [];
    const end = new Date();
    // back up to most recent Sunday for clean columns
    const start = new Date(end);
    start.setDate(start.getDate() - (HEATMAP_WEEKS * 7 - 1));
    start.setDate(start.getDate() - start.getDay());
    const cursor = new Date(start);
    let max = 0;
    for (let w = 0; w < HEATMAP_WEEKS + 1; w++) {
      const col: { date: string; minutes: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const key = dateKey(cursor);
        const mins = statByDate.get(key)?.focus_minutes ?? 0;
        max = Math.max(max, mins);
        col.push({ date: key, minutes: cursor > end ? -1 : mins });
        cursor.setDate(cursor.getDate() + 1);
      }
      cols.push(col);
    }
    return { cols, max };
  }, [statByDate]);

  const heatLevel = (m: number) => {
    if (m < 0) return "opacity-0";
    if (m === 0) return "bg-muted/50";
    const ratio = heatmap.max > 0 ? m / heatmap.max : 0;
    if (ratio > 0.66) return "bg-primary";
    if (ratio > 0.33) return "bg-primary/60";
    return "bg-primary/30";
  };

  const RANGES: { id: Range; label: string }[] = [
    { id: "7d", label: "7 Days" }, { id: "4w", label: "4 Weeks" }, { id: "6m", label: "6 Months" },
  ];

  return (
    <div className="glass rounded-3xl p-6 border border-border/60">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Focus Analytics</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalHours.toFixed(1)}h focused · {totalSessions} sessions this period
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-muted/40 p-1 border border-border/50">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={cn("px-3 py-1 text-xs font-semibold rounded-lg transition-colors", range === r.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >{r.label}</button>
          ))}
        </div>
      </div>

      {/* Hours area chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} stroke="currentColor" opacity={0.4} tickLine={false} axisLine={false} width={36} unit="h" />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--background)", fontSize: 12 }}
              formatter={(v) => [`${v}h`, "Focus"]}
            />
            <Area type="monotone" dataKey="hours" stroke="var(--primary)" strokeWidth={2.5} fill="url(#focusGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Sessions bar chart */}
      <div className="h-32 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} stroke="currentColor" opacity={0.4} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--background)", fontSize: 12 }} formatter={(v) => [v, "Sessions"]} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
            <Bar dataKey="sessions" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.55} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap */}
      <div className="mt-6 pt-5 border-t border-border/50">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Focus Heatmap</p>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>Less</span>
            <span className="h-2.5 w-2.5 rounded-sm bg-muted/50" />
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/30" />
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/60" />
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            <span>More</span>
          </div>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1 min-w-fit">
            {heatmap.cols.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-1">
                {col.map((cell, ri) => (
                  <div
                    key={ri}
                    className={cn("h-2.5 w-2.5 rounded-sm", heatLevel(cell.minutes))}
                    title={cell.minutes >= 0 ? `${cell.date}: ${(cell.minutes / 60).toFixed(1)}h` : ""}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
