"use client";

import { useState } from "react";
import Link from "next/link";
import { Palette, Bell, User as UserIcon, Sun, Moon, Check, ChevronRight, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useAccent, ACCENTS, type AccentKey } from "@/hooks/use-accent";
import { NotificationSettingsPanel } from "@/components/notifications/notification-settings-panel";

type Tab = "appearance" | "notifications" | "profile";

const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "profile", label: "Profile", icon: UserIcon },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("appearance");
  const { theme, toggleTheme, mounted } = useTheme();
  const { accent, setAccent } = useAccent();

  const setMode = (mode: "light" | "dark") => { if (mounted && theme !== mode) toggleTheme(); };

  return (
    <div className="space-y-6 pb-16 max-w-2xl">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600 flex items-center gap-2.5">
          <Settings2 className="h-8 w-8 text-primary" /> Settings
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">Manage appearance, reminders and your profile in one place.</p>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-2xl bg-muted/40 p-1 border border-border/50">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-colors", tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            <t.icon className="h-4 w-4" /> <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "appearance" && (
        <div className="space-y-6">
          {/* Theme */}
          <div className="glass rounded-3xl p-6 border border-border/60">
            <p className="font-bold mb-1">Theme</p>
            <p className="text-sm text-muted-foreground mb-4">Switch between light and dark mode.</p>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button onClick={() => setMode("light")}
                className={cn("flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-bold transition-all", mounted && theme === "light" ? "border-primary bg-primary/5 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40")}>
                <Sun className="h-4 w-4" /> Light
              </button>
              <button onClick={() => setMode("dark")}
                className={cn("flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-bold transition-all", mounted && theme === "dark" ? "border-primary bg-primary/5 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40")}>
                <Moon className="h-4 w-4" /> Dark
              </button>
            </div>
          </div>

          {/* Accent */}
          <div className="glass rounded-3xl p-6 border border-border/60">
            <p className="font-bold mb-1">Accent color</p>
            <p className="text-sm text-muted-foreground mb-4">Personalize the primary color used across StudyFlow.</p>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(ACCENTS) as AccentKey[]).map((key) => (
                <button key={key} onClick={() => setAccent(key)} title={ACCENTS[key].label}
                  className={cn("h-11 w-11 rounded-2xl flex items-center justify-center text-white transition-transform", accent === key ? "ring-2 ring-offset-2 ring-offset-background ring-foreground/40 scale-110" : "hover:scale-110")}
                  style={{ backgroundColor: ACCENTS[key].primary }}>
                  {accent === key && <Check className="h-5 w-5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "notifications" && <NotificationSettingsPanel />}

      {tab === "profile" && (
        <Link href="/dashboard/profile" className="glass rounded-3xl p-6 border border-border/60 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><UserIcon className="h-5 w-5" /></div>
            <div>
              <p className="font-bold">Profile details</p>
              <p className="text-sm text-muted-foreground">Edit your name, username, avatar and bio.</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}
