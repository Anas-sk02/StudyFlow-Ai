"use client";

import { isSameDay, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";
import {
  buildMonthMatrix, WEEKDAY_LABELS, itemsOnDay, localDateKey, type CalendarItem,
} from "@/lib/calendar";
import { ItemChip } from "./item-chip";

export function MonthView({ cursor, items, focusByDate, onAddOnDay, onSelectItem, onDropItem }: {
  cursor: Date;
  items: CalendarItem[];
  focusByDate: Map<string, number>;
  onAddOnDay: (day: Date) => void;
  onSelectItem: (item: CalendarItem) => void;
  onDropItem: (itemId: string, day: Date) => void;
}) {
  const days = buildMonthMatrix(cursor).flat();
  const today = new Date();

  return (
    <div className="glass rounded-3xl p-2 sm:p-3 border border-border/60">
      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          const dayItems = itemsOnDay(items, day);
          const focusMin = focusByDate.get(localDateKey(day)) ?? 0;
          return (
            <div
              key={day.toISOString()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onDropItem(e.dataTransfer.getData("text/plain"), day); }}
              onClick={() => onAddOnDay(day)}
              className={cn(
                "min-h-[92px] sm:min-h-[116px] rounded-xl border p-1.5 flex flex-col gap-1 transition-colors cursor-pointer",
                inMonth ? "border-border/50 bg-background/40 hover:bg-muted/30" : "border-transparent opacity-50",
                isToday && "ring-1 ring-primary/40 bg-primary/[0.04]",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full",
                  isToday && "bg-primary text-primary-foreground",
                )}>{day.getDate()}</span>
                {focusMin > 0 && (
                  <span title={`${(focusMin / 60).toFixed(1)}h focused`} className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayItems.slice(0, 3).map((it) => (
                  <ItemChip key={it.id} item={it} onClick={() => onSelectItem(it)} />
                ))}
                {dayItems.length > 3 && (
                  <span className="text-[10px] text-muted-foreground font-semibold pl-1">+{dayItems.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
