"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const data = [
  { day: "Mon", hours: 2 },
  { day: "Tue", hours: 3.5 },
  { day: "Wed", hours: 1.5 },
  { day: "Thu", hours: 4 },
  { day: "Fri", hours: 3 },
  { day: "Sat", hours: 5 },
  { day: "Sun", hours: 2.5 },
];

export function AnalyticsChart() {
  return (
    <div className="glass h-72 rounded-2xl p-4">
      <p className="mb-2 font-medium">Weekly Study Hours</p>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="study" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <Tooltip />
          <Area type="monotone" dataKey="hours" stroke="#2563eb" fillOpacity={1} fill="url(#study)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
