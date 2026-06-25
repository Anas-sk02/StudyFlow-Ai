"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell, CheckCheck, Clock, X, CalendarClock, AlertTriangle, Timer, Trophy, Info,
  Settings2, type LucideIcon,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { useNotifications } from "./notification-provider";
import type { AppNotification, NotificationType } from "@/lib/types";

const TYPE_ICON: Record<NotificationType, { icon: LucideIcon; tint: string }> = {
  deadline:    { icon: CalendarClock, tint: "bg-amber-500/10 text-amber-500" },
  overdue:     { icon: AlertTriangle, tint: "bg-red-500/10 text-red-500" },
  pomodoro:    { icon: Timer, tint: "bg-primary/10 text-primary" },
  focus:       { icon: Timer, tint: "bg-emerald-500/10 text-emerald-500" },
  achievement: { icon: Trophy, tint: "bg-amber-500/10 text-amber-500" },
  info:        { icon: Info, tint: "bg-muted text-muted-foreground" },
  system:      { icon: Info, tint: "bg-muted text-muted-foreground" },
};

const SNOOZE_OPTIONS: { label: string; minutes: number }[] = [
  { label: "10 min", minutes: 10 },
  { label: "1 hour", minutes: 60 },
  { label: "Tomorrow", minutes: 60 * 18 },
];

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, remove, snooze } = useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [snoozingId, setSnoozingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSnoozingId(null); }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const onOpenItem = (n: AppNotification) => {
    void markRead(n.id);
    if (n.link) { router.push(n.link); setOpen(false); }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 flex items-center justify-center rounded-full border border-border/60 bg-muted/30 hover:bg-muted hover:text-foreground text-muted-foreground transition-all"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute notification-dropdown mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-background shadow-[0_20px_50px_rgba(0,0,0,0.18)] overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200"
          style={isMobile ? {
            position: "fixed",
            top: "64px",
            left: "16px",
            right: "16px",
            width: "auto",
            maxWidth: "none",
          } : undefined}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <p className="text-sm font-bold">Notifications</p>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={() => void markAllRead()} className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors px-1.5 py-1 rounded-lg">
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
              <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" title="Notification settings">
                <Settings2 className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium">You&apos;re all caught up</p>
                <p className="text-xs text-muted-foreground mt-0.5">Reminders will show up here.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_ICON[n.type] ?? TYPE_ICON.info;
                const Icon = meta.icon;
                return (
                  <div key={n.id} className={cn("group relative flex gap-3 px-4 py-3 border-b border-border/40 last:border-0 transition-colors", !n.read && "bg-primary/[0.035]")}>
                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", meta.tint)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <button onClick={() => onOpenItem(n)} className="min-w-0 flex-1 text-left">
                      <p className={cn("text-sm leading-snug", n.read ? "font-medium" : "font-bold")}>{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.created_at)}</p>
                    </button>
                    {!n.read && <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary" />}

                    {snoozingId === n.id ? (
                      <div className="absolute inset-x-2 bottom-1.5 flex items-center gap-1 bg-background/95 backdrop-blur rounded-lg p-1 shadow border border-border/60">
                        {SNOOZE_OPTIONS.map((o) => (
                          <button key={o.minutes} onClick={() => { void snooze(n.id, o.minutes); setSnoozingId(null); }} className="flex-1 text-[10px] font-bold px-1.5 py-1 rounded-md bg-muted/60 hover:bg-muted transition-colors">{o.label}</button>
                        ))}
                        <button onClick={() => setSnoozingId(null)} className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setSnoozingId(n.id)} className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Snooze"><Clock className="h-3.5 w-3.5" /></button>
                        <button onClick={() => void remove(n.id)} className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Dismiss"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
