"use client";

import { cn } from "@/lib/utils";
import { colorTokens, formatTime, type CalendarItem } from "@/lib/calendar";
import { Timer } from "lucide-react";

export function ItemChip({ item, onClick, showTime = true }: {
  item: CalendarItem;
  onClick?: () => void;
  showTime?: boolean;
}) {
  const c = colorTokens(item.color);
  return (
    <button
      draggable={item.draggable}
      onDragStart={(e) => { if (item.draggable) e.dataTransfer.setData("text/plain", item.id); }}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn(
        "w-full text-left rounded-md px-1.5 py-1 text-[11px] font-medium flex items-center gap-1 truncate transition-all",
        c.chip,
        item.draggable ? "cursor-grab active:cursor-grabbing hover:brightness-105" : "cursor-default",
        item.done && "opacity-50 line-through",
      )}
      title={`${item.title}${item.subject ? ` · ${item.subject}` : ""}`}
    >
      {item.type === "focus"
        ? <Timer className="h-3 w-3 shrink-0 opacity-80" />
        : <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", c.bar)} />}
      {showTime && !item.allDay && (
        <span className="tabular-nums opacity-70 shrink-0">{formatTime(item.start)}</span>
      )}
      <span className="truncate">{item.title}</span>
    </button>
  );
}
