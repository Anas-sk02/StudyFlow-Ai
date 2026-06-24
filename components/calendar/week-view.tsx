"use client";

import { isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { weekDays, itemsOnDay, localDateKey, type CalendarItem } from "@/lib/calendar";
import { ItemChip } from "./item-chip";

export function WeekView({ cursor, items, focusByDate, onAddOnDay, onSelectItem, onDropItem }: {
  cursor: Date;
  items: CalendarItem[];
  focusByDate: Map<string, number>;
  onAddOnDay: (day: Date) => void;
  onSelectItem: (item: CalendarItem) => void;
  onDropItem: (itemId: string, day: Date) => void;
}) {
  const days = weekDays(cursor);
  const today = new Date();

  return (
    <div className="glass rounded-3xl p-2 sm:p-3 border border-border/60 overflow-x-auto">
      <div className="grid grid-cols-7 gap-1 min-w-[680px]">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const dayItems = itemsOnDay(items, day);
          const focusMin = focusByDate.get(localDateKey(day)) ?? 0;
          return (
            <div
              key={day.toISOString()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onDropItem(e.dataTransfer.getData("text/plain"), day); }}
              className="flex flex-col"
            >
              <button
                onClick={() => onAddOnDay(day)}
                className={cn("rounded-xl px-2 py-2 mb-1 text-center transition-colors hover:bg-muted/40", isToday && "bg-primary/[0.06]")}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{day.toLocaleDateString(undefined, { weekday: "short" })}</p>
                <p className={cn("text-lg font-black mt-0.5", isToday && "text-primary")}>{day.getDate()}</p>
                {focusMin > 0 && <span className="inline-block mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
              </button>
              <div
                onClick={() => onAddOnDay(day)}
                className="flex-1 min-h-[280px] rounded-xl border border-border/40 bg-background/30 p-1 flex flex-col gap-1 cursor-pointer hover:bg-muted/20 transition-colors"
              >
                {dayItems.length === 0
                  ? <span className="text-[10px] text-muted-foreground/40 text-center mt-4">No plans</span>
                  : dayItems.map((it) => <ItemChip key={it.id} item={it} onClick={() => onSelectItem(it)} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
