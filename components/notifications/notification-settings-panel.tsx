"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock, AlertTriangle, Timer, Sparkles, Mail, MonitorSmartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "./notification-provider";
import { browserPermission, requestBrowserPermission } from "@/lib/notifications";
import type { NotificationSettings } from "@/lib/types";

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("relative h-6 w-11 rounded-full transition-colors shrink-0", on ? "bg-primary" : "bg-muted-foreground/30")}
      role="switch"
      aria-checked={on}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

type ToggleKey = keyof Omit<NotificationSettings, "user_id" | "created_at" | "updated_at" | "browser_enabled">;

const ROWS: { key: ToggleKey; label: string; desc: string; icon: typeof Timer; tint: string }[] = [
  { key: "deadlines", label: "Deadline reminders", desc: "Alert me when a task is due within 24 hours.", icon: CalendarClock, tint: "bg-amber-500/10 text-amber-500" },
  { key: "overdue", label: "Overdue alerts", desc: "Tell me when a task has slipped past its deadline.", icon: AlertTriangle, tint: "bg-red-500/10 text-red-500" },
  { key: "pomodoro", label: "Pomodoro alerts", desc: "Notify me when a focus session or break ends.", icon: Timer, tint: "bg-primary/10 text-primary" },
  { key: "focus_reminders", label: "Focus Hub reminders", desc: "Nudge me to study if I haven't focused today.", icon: Sparkles, tint: "bg-emerald-500/10 text-emerald-500" },
  { key: "daily_summary", label: "Daily email summary", desc: "Email digest of deadlines (requires email reminders cron).", icon: Mail, tint: "bg-indigo-500/10 text-indigo-500" },
];

export function NotificationSettingsPanel() {
  const { settings, updateSettings } = useNotifications();
  const [perm, setPerm] = useState<string>("default");

  // eslint-disable-next-line react-hooks/set-state-in-effect -- read client-only permission on mount
  useEffect(() => { setPerm(browserPermission()); }, []);

  const enableBrowser = async () => {
    const result = await requestBrowserPermission();
    setPerm(result);
    if (result === "granted") { await updateSettings({ browser_enabled: true }); toast.success("Browser notifications enabled."); }
    else if (result === "denied") toast.error("Browser blocked notifications. Enable them in your browser settings.");
    else if (result === "unsupported") toast.error("This browser doesn't support notifications.");
  };

  return (
    <div className="space-y-6">
      {/* Browser permission */}
      <div className="glass rounded-3xl p-6 border border-border/60">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><MonitorSmartphone className="h-5 w-5" /></div>
            <div>
              <p className="font-bold">Browser notifications</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {perm === "granted" ? "Enabled — alerts appear even when this tab is in the background."
                  : perm === "denied" ? "Blocked by your browser. Re-enable them in site settings."
                  : perm === "unsupported" ? "Not supported on this browser."
                  : "Allow desktop alerts for reminders while StudyFlow is open."}
              </p>
            </div>
          </div>
          {perm === "granted" ? (
            <Toggle on={settings.browser_enabled} onClick={() => void updateSettings({ browser_enabled: !settings.browser_enabled })} />
          ) : (
            <button onClick={() => void enableBrowser()} disabled={perm === "denied" || perm === "unsupported"} className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 shrink-0">
              Enable
            </button>
          )}
        </div>
      </div>

      {/* Toggles */}
      <div className="glass rounded-3xl p-2 border border-border/60">
        {ROWS.map((r, i) => (
          <div key={r.key} className={cn("flex items-center justify-between gap-4 p-4", i !== ROWS.length - 1 && "border-b border-border/40")}>
            <div className="flex items-start gap-3 min-w-0">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", r.tint)}><r.icon className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="font-semibold">{r.label}</p>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
              </div>
            </div>
            <Toggle on={settings[r.key]} onClick={() => void updateSettings({ [r.key]: !settings[r.key] } as Partial<NotificationSettings>)} />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground px-1">
        In-app reminders always appear in the bell menu. Browser pop-ups also require the permission above.
      </p>
    </div>
  );
}
