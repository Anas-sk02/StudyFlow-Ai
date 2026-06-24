import type { NotificationType, NotificationSettings } from "@/lib/types";

export const DEFAULT_NOTIFICATION_SETTINGS: Omit<NotificationSettings, "user_id"> = {
  browser_enabled: true,
  deadlines: true,
  overdue: true,
  pomodoro: true,
  focus_reminders: true,
  daily_summary: false,
};

/** Which preference toggle gates a given notification type (null = always allowed). */
export const SETTING_FOR_TYPE: Record<NotificationType, keyof NotificationSettings | null> = {
  info: null,
  system: null,
  achievement: null,
  deadline: "deadlines",
  overdue: "overdue",
  pomodoro: "pomodoro",
  focus: "focus_reminders",
};

export function browserSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function browserPermission(): NotificationPermission | "unsupported" {
  if (!browserSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestBrowserPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!browserSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Fire an OS-level notification (no-op unless supported & granted). */
export function fireBrowserNotification(title: string, opts: { body?: string; tag?: string; link?: string } = {}): void {
  if (!browserSupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body: opts.body, tag: opts.tag, icon: "/favicon.ico" });
    n.onclick = () => {
      window.focus();
      if (opts.link) window.location.href = opts.link;
      n.close();
    };
  } catch {
    // some browsers throw if constructed outside a service worker — ignore
  }
}
