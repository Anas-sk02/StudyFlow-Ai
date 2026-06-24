"use client";

import { BellRing } from "lucide-react";
import { NotificationSettingsPanel } from "@/components/notifications/notification-settings-panel";

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6 pb-16 max-w-2xl">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600 flex items-center gap-2.5">
          <BellRing className="h-8 w-8 text-primary" /> Notifications
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">Choose what you get reminded about and how.</p>
      </div>
      <NotificationSettingsPanel />
    </div>
  );
}
