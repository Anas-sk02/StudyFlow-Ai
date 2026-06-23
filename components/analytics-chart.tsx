"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface AnalyticsChartProps {
  data: Array<{ day: string; hours: number; tasks: number }>;
  loading?: boolean;
}

export function AnalyticsChart({ data, loading }: AnalyticsChartProps) {
  if (loading) {
    return (
      <div className="glass h-72 rounded-2xl p-4 animate-pulse">
        <div className="h-5 w-40 bg-muted/60 rounded mb-4" />
        <div className="h-[80%] bg-muted/30 rounded-xl" />
      </div>
    );
  }

  const totalHours = data.reduce((sum, d) => sum + d.hours, 0);
  const totalTasks = data.reduce((sum, d) => sum + d.tasks, 0);

  return (
    <div className="glass h-72 rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-sm">Weekly Study Hours</p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>{totalHours.toFixed(1)}h total</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span>{totalTasks} tasks</span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="study" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11 }}
              stroke="currentColor"
              opacity={0.4}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="currentColor"
              opacity={0.4}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--background)",
                fontSize: 12,
              }}
              formatter={(value, name) => [
                name === "hours" ? `${Number(value)}h` : value,
                name === "hours" ? "Hours" : "Tasks",
              ]}
            />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="#2563eb"
              fillOpacity={1}
              fill="url(#study)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
