"use client";

import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { colorTokens, formatTime, localDateKey, type CalendarItem } from "@/lib/calendar";

export function AgendaView({ items, onSelectItem }: {
  items: CalendarItem[];
  onSelectItem: (item: CalendarItem) => void;
}) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const upcoming = items
    .filter((it) => it.start >= start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (upcoming.length === 0) {
    return (
      <div className="glass rounded-3xl border border-dashed border-border/60 py-16 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center">
          <CalendarRange className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-bold">Nothing scheduled ahead</h3>
        <p className="text-sm text-muted-foreground mt-1">Add a study block or set a task deadline to see it here.</p>
      </div>
    );
  }

  // group by day
  const groups: { key: string; day: Date; items: CalendarItem[] }[] = [];
  const index = new Map<string, number>();
  for (const it of upcoming) {
    const key = localDateKey(it.start);
    if (!index.has(key)) { index.set(key, groups.length); groups.push({ key, day: it.start, items: [] }); }
    groups[index.get(key)!].items.push(it);
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.key} className="glass rounded-3xl p-5 border border-border/60">
          <div className="flex items-baseline gap-2 mb-3">
            <h3 className="font-bold">{g.day.toLocaleDateString(undefined, { weekday: "long" })}</h3>
            <span className="text-sm text-muted-foreground">{g.day.toLocaleDateString(undefined, { month: "long", day: "numeric" })}</span>
          </div>
          <div className="space-y-2">
            {g.items.map((it) => {
              const c = colorTokens(it.color);
              return (
                <button
                  key={it.id}
                  onClick={() => onSelectItem(it)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/10 p-3 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className={cn("w-1.5 self-stretch rounded-full shrink-0", c.bar)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-semibold truncate", it.done && "line-through text-muted-foreground")}>{it.title}</p>
                    {it.subject && <p className="text-xs text-muted-foreground truncate">{it.subject}</p>}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums shrink-0">
                    {it.allDay ? "All day" : formatTime(it.start)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
