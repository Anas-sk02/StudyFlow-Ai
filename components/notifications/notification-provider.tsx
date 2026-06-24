"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { createClient } from "@/supabase/client";
import {
  DEFAULT_NOTIFICATION_SETTINGS, SETTING_FOR_TYPE, fireBrowserNotification,
} from "@/lib/notifications";
import type {
  AppNotification, NotificationSettings, NotificationType, StudyTask,
} from "@/lib/types";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  tag?: string | null;
  browser?: boolean;
}

interface NotificationContextValue {
  loading: boolean;
  notifications: AppNotification[]; // visible (not snoozed into the future), newest first
  unreadCount: number;
  settings: NotificationSettings;

  notify: (input: NotifyInput) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  snooze: (id: string, minutes: number) => Promise<void>;
  updateSettings: (patch: Partial<NotificationSettings>) => Promise<void>;
  reload: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within <NotificationProvider>");
  return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({ user_id: "", ...DEFAULT_NOTIFICATION_SETTINGS });
  const [nowTs, setNowTs] = useState(0);

  const fetchList = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("notifications").select("*").eq("user_id", uid)
      .order("created_at", { ascending: false }).limit(60);
    setAll((data ?? []) as AppNotification[]);
  }, [supabase]);

  // ----------------------------------------------------------- scanners
  const runScanners = useCallback(async (uid: string, s: NotificationSettings) => {
    const now = new Date();
    const candidates: { type: NotificationType; title: string; body: string | null; link: string | null; tag: string }[] = [];

    if (s.deadlines || s.overdue) {
      const { data: tasks } = await supabase
        .from("study_tasks").select("*").eq("user_id", uid).neq("status", "done").not("deadline", "is", null);
      for (const t of (tasks ?? []) as StudyTask[]) {
        const due = new Date(`${t.deadline}T${t.due_time ?? "23:59:59"}`);
        const diffH = (due.getTime() - now.getTime()) / 3_600_000;
        if (diffH < 0 && s.overdue) {
          candidates.push({ type: "overdue", title: `Overdue: ${t.title}`, body: `${t.subject} was due ${due.toLocaleDateString()}`, link: "/dashboard/tasks", tag: `overdue:${t.id}` });
        } else if (diffH >= 0 && diffH <= 24 && s.deadlines) {
          candidates.push({ type: "deadline", title: `Due soon: ${t.title}`, body: `${t.subject} is due ${due.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`, link: "/dashboard/tasks", tag: `deadline:${t.id}` });
        }
      }
    }

    if (s.focus_reminders && now.getHours() >= 17) {
      const { data: today } = await supabase
        .from("focus_daily_stats").select("focus_minutes").eq("user_id", uid).eq("date", todayKey()).maybeSingle();
      const mins = (today?.focus_minutes as number | undefined) ?? 0;
      if (mins === 0) {
        candidates.push({ type: "focus", title: "No focus time today", body: "Squeeze in a quick Pomodoro before the day ends.", link: "/dashboard/focus", tag: `focus-nudge:${todayKey()}` });
      }
    }

    if (candidates.length === 0) return;

    const tags = candidates.map((c) => c.tag);
    const { data: existing } = await supabase
      .from("notifications").select("tag").eq("user_id", uid).in("tag", tags);
    const have = new Set((existing ?? []).map((e: { tag: string | null }) => e.tag));
    const fresh = candidates.filter((c) => !have.has(c.tag));
    if (fresh.length === 0) return;

    await supabase.from("notifications").insert(fresh.map((c) => ({ user_id: uid, ...c })));

    // surface a few as OS notifications too (deduped, so only once ever per tag)
    if (s.browser_enabled) {
      fresh.slice(0, 3).forEach((c) => fireBrowserNotification(c.title, { body: c.body ?? undefined, tag: c.tag, link: c.link ?? undefined }));
    }
  }, [supabase]);

  // ------------------------------------------------------------- load
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data: sRow } = await supabase
        .from("notification_settings").select("*").eq("user_id", user.id).maybeSingle();
      let s: NotificationSettings;
      if (sRow) {
        s = sRow as NotificationSettings;
      } else {
        s = { user_id: user.id, ...DEFAULT_NOTIFICATION_SETTINGS };
        await supabase.from("notification_settings").insert({ user_id: user.id });
      }
      setSettings(s);

      await runScanners(user.id, s);
      await fetchList(user.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [supabase, runScanners, fetchList]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load (matches app-wide pattern)
  useEffect(() => { void loadAll(); }, [loadAll]);

  // keep a clock in state so snoozed items resurface (avoids Date.now() during render)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed the clock on mount
    setNowTs(Date.now());
    const i = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);

  // live updates via realtime (no-op if the publication isn't enabled)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => { void fetchList(userId); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, userId, fetchList]);

  // refresh when the tab regains focus (catches reminders raised elsewhere)
  useEffect(() => {
    const onFocus = () => { if (userId) void fetchList(userId); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [userId, fetchList]);

  // --------------------------------------------------------- derived
  const visible = useMemo(() => {
    if (!nowTs) return all;
    return all.filter((n) => !n.snooze_until || new Date(n.snooze_until).getTime() <= nowTs);
  }, [all, nowTs]);
  const unreadCount = useMemo(() => visible.filter((n) => !n.read).length, [visible]);

  // --------------------------------------------------------- actions
  const notify = useCallback(async (input: NotifyInput) => {
    if (!userId) return;
    const s = settings;
    const gate = SETTING_FOR_TYPE[input.type];
    if (gate && !s[gate]) return; // muted by preferences

    if (input.tag && all.some((n) => n.tag === input.tag && !n.read)) return; // already pending

    const row = {
      user_id: userId, type: input.type, title: input.title,
      body: input.body ?? null, link: input.link ?? null, tag: input.tag ?? null,
    };
    const { data } = await supabase.from("notifications").insert(row).select("*").single();
    if (data) setAll((prev) => [data as AppNotification, ...prev]);

    if ((input.browser ?? true) && s.browser_enabled) {
      fireBrowserNotification(input.title, { body: input.body ?? undefined, tag: input.tag ?? undefined, link: input.link ?? undefined });
    }
  }, [supabase, userId, all, settings]);

  const markRead = useCallback(async (id: string) => {
    setAll((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }, [supabase]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setAll((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  }, [supabase, userId]);

  const remove = useCallback(async (id: string) => {
    setAll((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  }, [supabase]);

  const snooze = useCallback(async (id: string, minutes: number) => {
    const until = new Date(Date.now() + minutes * 60_000).toISOString();
    setAll((prev) => prev.map((n) => (n.id === id ? { ...n, snooze_until: until, read: false } : n)));
    await supabase.from("notifications").update({ snooze_until: until, read: false }).eq("id", id);
  }, [supabase]);

  const updateSettings = useCallback(async (patch: Partial<NotificationSettings>) => {
    if (!userId) return;
    setSettings((prev) => ({ ...prev, ...patch }));
    await supabase.from("notification_settings").upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() });
  }, [supabase, userId]);

  const value: NotificationContextValue = {
    loading, notifications: visible, unreadCount, settings,
    notify, markRead, markAllRead, remove, snooze, updateSettings,
    reload: loadAll,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
