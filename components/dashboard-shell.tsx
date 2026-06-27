"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { Bell, Calendar, CalendarDays, ListTodo, Moon, Sparkles, Sun, Search, Command as CmdIcon, ChevronLeft, ChevronRight, Menu, LogOut, User as UserIcon, BookOpen, Palette, Timer, Settings as SettingsIcon, MessageSquare } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { createClient } from "@/supabase/client";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import Image from "next/image";

const links = [
  { href: "/dashboard", label: "Overview", icon: Calendar },
  { href: "/dashboard/tasks", label: "Study Planner", icon: ListTodo },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/rooms", label: "Study Rooms", icon: Bell },
  { href: "/dashboard/files", label: "Notes & Files", icon: CmdIcon },
  { href: "/dashboard/whiteboard", label: "Whiteboard", icon: Palette },
  { href: "/dashboard/focus", label: "Focus Hub", icon: Timer },
  { href: "/dashboard/tutor", label: "Ask AI", icon: MessageSquare },
  { href: "/dashboard/ai", label: "AI Studio", icon: Sparkles },
];

function SidebarContent({
  pathname,
  isDesktop,
  isSidebarOpen,
  setIsSidebarOpen,
  recentDoc,
}: {
  pathname: string;
  isDesktop: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  recentDoc: { file_name: string } | null;
}) {
  return (
    <>
      <div className={cn("flex h-16 items-center border-b border-border/50", isDesktop && isSidebarOpen ? "px-6" : "justify-center")}>
        {(!isDesktop || isSidebarOpen) ? (
          <BrandLogo size={30} textClassName="text-lg" />
        ) : (
          <BrandMark size={34} />
        )}
      </div>

      {isDesktop && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-20 hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:text-primary transition-colors z-10"
        >
          {isSidebarOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
      )}

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto overflow-x-hidden">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group relative",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                (isDesktop && !isSidebarOpen) && "justify-center px-0"
              )}
              title={(isDesktop && !isSidebarOpen) ? link.label : undefined}
            >
              {isActive && (!isDesktop || isSidebarOpen) && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
              )}
              <link.icon className={cn("h-4 w-4 shrink-0 transition-transform", isActive ? "text-primary" : "text-muted-foreground group-hover:scale-110")} />
              {(!isDesktop || isSidebarOpen) && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("p-4 border-t border-border/50", (isDesktop && !isSidebarOpen) && "flex flex-col items-center px-2")}>
        {(!isDesktop || isSidebarOpen) ? (
          <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600/60">Continue Studying</span>
              <BookOpen className="h-3 w-3 text-indigo-600" />
            </div>
            {recentDoc ? (
              <Link href="/dashboard/files" className="block group/item">
                <p className="text-xs font-bold truncate group-hover/item:text-primary transition-colors">{recentDoc.file_name}</p>
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                  <span>Open file</span>
                  <ChevronRight className="h-2 w-2" />
                </div>
              </Link>
            ) : (
              <p className="text-[10px] text-muted-foreground italic">No recent documents</p>
            )}
          </div>
        ) : (
          <Link href="/dashboard/files" className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 transition-all hover:scale-110">
            <BookOpen className="h-5 w-5" />
          </Link>
        )}
      </div>
    </>
  );
}

export function DashboardShell({ children, user }: { children: React.ReactNode; user?: { id?: string; email?: string; user_metadata?: Record<string, unknown> } }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme, mounted } = useTheme();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [recentDoc, setRecentDoc] = useState<{ file_name: string } | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{
    tasks: { id: string; title: string; subject: string }[];
    files: { id: string; file_name: string }[];
    events: { id: string; title: string; subject: string | null }[];
  }>({ tasks: [], files: [], events: [] });

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) setProfile(data);
  }, [user?.id, supabase]);

  const fetchRecentDoc = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("documents")
      .select("id, file_name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setRecentDoc(data);
  }, [user?.id, supabase]);

  // Fetch profile on mount
  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  // On route change: close mobile sidebar and refresh recent doc
  useEffect(() => {
    setIsMobileOpen(false);
    void fetchRecentDoc();
  }, [pathname, fetchRecentDoc]);

  // Keyboard shortcut: Cmd+K
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Global search (debounced) — all state changes happen inside the timer
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const t = setTimeout(async () => {
      if (q.length < 2) { setResults({ tasks: [], files: [], events: [] }); setSearching(false); return; }
      setSearching(true);
      const safe = q.replace(/[%,()]/g, " ");
      const [tasksRes, filesRes, eventsRes] = await Promise.all([
        supabase.from("study_tasks").select("id, title, subject").or(`title.ilike.%${safe}%,subject.ilike.%${safe}%`).limit(5),
        supabase.from("documents").select("id, file_name").ilike("file_name", `%${safe}%`).limit(5),
        supabase.from("study_events").select("id, title, subject").or(`title.ilike.%${safe}%,subject.ilike.%${safe}%`).limit(5),
      ]);
      setResults({
        tasks: (tasksRes.data ?? []) as { id: string; title: string; subject: string }[],
        files: (filesRes.data ?? []) as { id: string; file_name: string }[],
        events: (eventsRes.data ?? []) as { id: string; title: string; subject: string | null }[],
      });
      setSearching(false);
    }, 180);
    return () => clearTimeout(t);
  }, [query, open, supabase]);

  // Click outside profile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    setIsMobileOpen(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error.message);
    }
    router.push("/login");
  };

  const fullName = (profile?.full_name || user?.user_metadata?.full_name || "") as string;
  const email = (user?.email || "") as string;
  const initial = fullName ? fullName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase() || "U";
  const avatarUrl = (profile?.avatar_url || user?.user_metadata?.avatar_url) as string | undefined;

  const ql = query.trim().toLowerCase();
  const navMatches = ql ? links.filter((l) => l.label.toLowerCase().includes(ql)) : links;
  const closeSearch = (href: string) => { router.push(href); setOpen(false); setQuery(""); };

  return (
    <NotificationProvider>
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[260px] bg-card/95 backdrop-blur-xl border-r border-border transition-transform duration-300 ease-in-out md:hidden flex flex-col",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent
          pathname={pathname}
          isDesktop={false}
          isSidebarOpen={true}
          setIsSidebarOpen={setIsSidebarOpen}
          recentDoc={recentDoc}
        />
      </aside>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col border-r border-border bg-card/50 backdrop-blur-xl transition-all duration-300 relative",
        isSidebarOpen ? "w-[260px]" : "w-[80px] items-center"
      )}>
        <SidebarContent
          pathname={pathname}
          isDesktop={true}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          recentDoc={recentDoc}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setOpen(true)}
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-2 text-sm text-muted-foreground hover:bg-muted/80 transition-all w-full md:w-80 lg:w-96 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <Search className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="truncate group-hover:text-foreground transition-colors">Search anything...</span>
              <kbd className="ml-auto hidden sm:inline-flex h-5 items-center gap-1 rounded bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground border border-border group-hover:text-foreground transition-colors">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-3 sm:ml-6">
            <NotificationBell />
            <button
              onClick={toggleTheme}
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/30 hover:bg-muted hover:text-foreground text-muted-foreground transition-all"
            >
              {mounted ? (theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />) : <div className="h-4 w-4" />}
            </button>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 p-1 pr-3 hover:bg-muted/80 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" width={28} height={28} className="rounded-full object-cover w-7 h-7" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                    {initial}
                  </div>
                )}
                <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">{fullName || email.split('@')[0]}</span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-background shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-border/50 bg-muted/30">
                    <p className="text-sm font-semibold truncate">{fullName || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                  </div>
                  <div className="p-2 space-y-1">
                    <Link href="/dashboard/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      Profile Settings
                    </Link>
                    <Link href="/dashboard/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                      <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                      Settings
                    </Link>
                    <button onClick={toggleTheme} className="w-full sm:hidden flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                      {mounted ? (theme === "light" ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />) : <div className="h-4 w-4" />}
                      Toggle Theme
                    </button>
                  </div>
                  <div className="p-2 border-t border-border/50">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="mx-auto max-w-5xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      <Command.Dialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}
        label="Command Menu"
        shouldFilter={false}
        className="fixed left-1/2 top-1/4 z-50 w-[90%] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl"
      >
        <Dialog.Title className="sr-only">Command Menu</Dialog.Title>
        <Command.Input
          value={query}
          onValueChange={setQuery}
          className="w-full border-b border-border bg-transparent px-4 py-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-0"
          placeholder="Search tasks, files, events — or jump to a page…"
        />
        <Command.List className="max-h-[340px] overflow-y-auto p-2">
          {searching && <div className="py-3 text-center text-xs text-muted-foreground">Searching…</div>}
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>

          {results.tasks.length > 0 && (
            <Command.Group heading="Tasks" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              {results.tasks.map((t) => (
                <Command.Item key={`task-${t.id}`} value={`task-${t.id}`} onSelect={() => closeSearch("/dashboard/tasks")}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors mt-1">
                  <ListTodo className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{t.title}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[30%]">{t.subject}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.files.length > 0 && (
            <Command.Group heading="Files" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              {results.files.map((f) => (
                <Command.Item key={`file-${f.id}`} value={`file-${f.id}`} onSelect={() => closeSearch("/dashboard/files")}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors mt-1">
                  <CmdIcon className="h-4 w-4 shrink-0 text-indigo-500" />
                  <span className="truncate">{f.file_name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.events.length > 0 && (
            <Command.Group heading="Calendar" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              {results.events.map((e) => (
                <Command.Item key={`event-${e.id}`} value={`event-${e.id}`} onSelect={() => closeSearch("/dashboard/calendar")}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors mt-1">
                  <CalendarDays className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="truncate">{e.title}</span>
                  {e.subject && <span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[30%]">{e.subject}</span>}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {navMatches.length > 0 && (
            <Command.Group heading="Navigation" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              {navMatches.map((link) => (
                <Command.Item
                  key={link.href}
                  value={`nav-${link.href}`}
                  onSelect={() => closeSearch(link.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground aria-selected:bg-primary/10 aria-selected:text-primary transition-colors mt-1"
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {link.label}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command.Dialog>
    </div>
    </NotificationProvider>
  );
}
