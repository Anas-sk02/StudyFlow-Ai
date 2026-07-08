import { createClient } from "@/supabase/server";

/** Public-safe shape returned for a user's profile page. Never includes email. */
export type PublicProfile = {
  id: string;
  username: string | null;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  xp: number;
  level: number;
  streakDays: number;
  totalFocusMinutes: number;
  /** 1-based rank by XP across all users, or null if it can't be determined. */
  rank: number | null;
};

/** A lightweight result used by the username search dropdown. */
export type ProfileSearchResult = {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  xp: number;
  streakDays: number;
};

/**
 * Fetch a single public profile by its (case-insensitive) username, including
 * gamification stats and the user's global XP rank. Returns null if no profile
 * with that username exists.
 */
export async function getPublicProfileByUsername(
  username: string,
): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, bio, avatar_url")
    .ilike("username", normalized)
    .maybeSingle();

  if (!profile) return null;

  const { data: stats } = await supabase
    .from("user_stats")
    .select("xp, level, streak_days, total_focus_minutes")
    .eq("user_id", profile.id)
    .maybeSingle();

  const xp = stats?.xp ?? 0;

  // Rank = number of users with strictly more XP, +1. Uses an exact count so
  // it stays correct as the user base grows without pulling every row.
  let rank: number | null = null;
  const { count, error: rankError } = await supabase
    .from("user_stats")
    .select("user_id", { count: "exact", head: true })
    .gt("xp", xp);
  if (!rankError && count !== null) rank = count + 1;

  return {
    id: profile.id,
    username: profile.username ?? null,
    fullName: profile.full_name ?? null,
    bio: profile.bio ?? null,
    avatarUrl: profile.avatar_url ?? null,
    xp,
    level: stats?.level ?? 1,
    streakDays: stats?.streak_days ?? 0,
    totalFocusMinutes: stats?.total_focus_minutes ?? 0,
    rank,
  };
}

/**
 * Search profiles by username or full name (case-insensitive, prefix + contains).
 * Returns up to `limit` results, enriched with basic stats for display.
 */
export async function searchProfiles(
  query: string,
  limit = 8,
): Promise<ProfileSearchResult[]> {
  const supabase = await createClient();
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];

  // Escape LIKE wildcards so a user typing % or _ doesn't match everything.
  const escaped = term.replace(/[%_]/g, (m) => `\\${m}`);
  const pattern = `%${escaped}%`;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
    .not("username", "is", null)
    .limit(limit);

  if (!profiles || profiles.length === 0) return [];

  const ids = profiles.map((p) => p.id);
  const { data: statsRows } = await supabase
    .from("user_stats")
    .select("user_id, xp, streak_days")
    .in("user_id", ids);

  const statsMap = new Map(
    (statsRows ?? []).map((s) => [s.user_id, s]),
  );

  return profiles.map((p) => {
    const s = statsMap.get(p.id);
    return {
      id: p.id,
      username: p.username ?? null,
      fullName: p.full_name ?? null,
      avatarUrl: p.avatar_url ?? null,
      xp: s?.xp ?? 0,
      streakDays: s?.streak_days ?? 0,
    };
  });
}
