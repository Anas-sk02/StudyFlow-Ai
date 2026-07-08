import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Flame, Star, Trophy, Clock } from "lucide-react";
import { getPublicProfileByUsername } from "@/lib/public-profile";
import { ShareProfileButton } from "@/components/share-profile-button";
import { BrandLogo } from "@/components/brand-logo";
import { BackButton } from "@/components/back-button";
import { createClient } from "@/supabase/server";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);

  if (!profile) {
    return { title: "User not found · StudyFlow AI" };
  }

  const name = profile.fullName || `@${profile.username}`;
  return {
    title: `${name} · StudyFlow AI`,
    description:
      profile.bio ||
      `${name} has ${profile.xp} XP and a ${profile.streakDays}-day study streak on StudyFlow AI.`,
  };
}

function formatFocusHours(minutes: number): string {
  const hours = minutes / 60;
  if (hours >= 10) return `${Math.round(hours)}h`;
  return `${hours.toFixed(1)}h`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  glowClass,
}: {
  icon: typeof Flame;
  label: string;
  value: string | number;
  accent: string;
  glowClass: string;
}) {
  return (
    <div className={cn(
      "rounded-3xl border border-border/60 bg-card/65 backdrop-blur-md p-6 flex flex-col items-center text-center gap-3 transition-all duration-300 shadow-sm",
      "hover:-translate-y-1 hover:shadow-md",
      glowClass
    )}>
      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner", accent)}>
        <Icon className="h-5.5 w-5.5 fill-current" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">{value}</span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);

  if (!profile || !profile.username) {
    notFound();
  }

  // Determine back navigation fallback based on user authentication status.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const fallbackUrl = user ? "/dashboard/profile" : "/";

  const name = profile.fullName || `@${profile.username}`;
  const initial = (profile.fullName || profile.username || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background ambient light effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-500/5" />
        <div className="absolute -top-[10%] -right-[10%] w-[45%] h-[55%] rounded-full bg-purple-500/10 blur-[120px] dark:bg-purple-500/5" />
        <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      {/* Top bar (sticky with glassmorphism) */}
      <header className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-md bg-background/80">
        <div className="mx-auto max-w-3xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton fallback={fallbackUrl} label="Back" />
            <div className="h-4 w-px bg-border/60 hidden sm:block" />
            <Link href="/" className="transition-opacity hover:opacity-80 hidden sm:block">
              <BrandLogo />
            </Link>
          </div>
          <ShareProfileButton username={profile.username} />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 animate-fade-in relative z-10">
        {/* Profile Card */}
        <section className="glass rounded-3xl border border-border/60 overflow-hidden shadow-lg">
          {/* Banner */}
          <div className="h-32 sm:h-40 bg-gradient-to-r from-primary via-indigo-600 to-purple-600 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="absolute -bottom-1 left-0 right-0 h-8 bg-gradient-to-t from-background/30 to-transparent" />
          </div>

          <div className="px-6 sm:px-8 pb-8">
            {/* Avatar & Title Overlapping Banner */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-16 sm:-mt-20">
              <div className="relative shrink-0">
                {profile.avatarUrl ? (
                  <Image
                    src={profile.avatarUrl}
                    alt={name}
                    width={140}
                    height={140}
                    className="rounded-full object-cover w-32 h-32 sm:w-36 sm:h-36 border-4 border-card shadow-2xl shrink-0 bg-background"
                  />
                ) : (
                  <div className="w-32 h-32 sm:w-36 sm:h-36 shrink-0 rounded-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-4xl sm:text-5xl font-bold text-white shadow-2xl border-4 border-card">
                    {initial}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 sm:pb-3">
                <h1 className="text-3xl font-extrabold tracking-tight truncate text-foreground">{name}</h1>
                <p className="text-sm font-medium text-muted-foreground">@{profile.username}</p>
              </div>

              {profile.rank !== null && (
                <div className="sm:pb-3 shrink-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-4 py-2 text-sm font-bold text-amber-600 dark:text-amber-400 shadow-sm animate-pulse duration-3000">
                    <Trophy className="h-4 w-4 fill-current" />
                    <span>Rank #{profile.rank}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Bio */}
            {profile.bio && (
              <div className="mt-8 pt-6 border-t border-border/40">
                <div className="border-l-3 border-primary/50 pl-4 py-1">
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line italic">
                    &ldquo;{profile.bio}&rdquo;
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={Flame}
            label="Day streak"
            value={profile.streakDays}
            accent="bg-orange-500/10 text-orange-500 border border-orange-500/10"
            glowClass="hover:border-orange-500/35 hover:shadow-orange-500/5 dark:hover:shadow-orange-500/2"
          />
          <StatCard
            icon={Star}
            label="Total XP"
            value={profile.xp}
            accent="bg-amber-500/10 text-amber-500 border border-amber-500/10"
            glowClass="hover:border-amber-500/35 hover:shadow-amber-500/5 dark:hover:shadow-amber-500/2"
          />
          <StatCard
            icon={Trophy}
            label="Level"
            value={profile.level}
            accent="bg-indigo-500/10 text-indigo-500 border border-indigo-500/10"
            glowClass="hover:border-indigo-500/35 hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/2"
          />
          <StatCard
            icon={Clock}
            label="Focus time"
            value={formatFocusHours(profile.totalFocusMinutes)}
            accent="bg-emerald-500/10 text-emerald-500 border border-emerald-500/10"
            glowClass="hover:border-emerald-500/35 hover:shadow-emerald-500/5 dark:hover:shadow-emerald-500/2"
          />
        </section>

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-muted-foreground">
          Powered by{" "}
          <Link href="/" className="font-semibold text-foreground hover:underline hover:text-primary transition-colors">
            StudyFlow AI
          </Link>
        </p>
      </div>
    </div>
  );
}
