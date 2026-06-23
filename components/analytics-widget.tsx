"use client";

import { useEffect, useState } from "react";
import { AnalyticsChart } from "@/components/analytics-chart";

interface AnalyticsData {
  weekly: Array<{ day: string; hours: number; tasks: number }>;
  summary: {
    totalTasks: number;
    completed: number;
    inProgress: number;
    focusMinutes: number;
    streakDays: number;
    xp: number;
    level: number;
  };
}

export function AnalyticsWidget() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // Silently fall back to empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <AnalyticsChart
        data={data?.weekly || []}
        loading={loading}
      />

      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Focus Time
            </p>
            <p className="text-lg font-bold">
              {(data.summary.focusMinutes / 60).toFixed(1)}h
            </p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Streak
            </p>
            <p className="text-lg font-bold text-orange-500">
              {data.summary.streakDays}d
            </p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Level
            </p>
            <p className="text-lg font-bold text-primary">
              {data.summary.level}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
