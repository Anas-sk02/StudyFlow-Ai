-- =====================================================================
--  StudyFlow AI · Focus Hub
--  Run this entire file in the Supabase SQL editor.
--  Safe to re-run (idempotent): uses IF NOT EXISTS / DROP POLICY IF EXISTS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. focus_preferences  (one row per user — timer + sound + goal config)
-- ---------------------------------------------------------------------
create table if not exists public.focus_preferences (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  focus_minutes           integer not null default 25,
  short_break_minutes     integer not null default 5,
  long_break_minutes      integer not null default 15,
  sessions_until_long_break integer not null default 4,
  auto_switch             boolean not null default true,
  -- ambient sound prefs
  ambient_sound           text,                       -- e.g. 'rain' | 'forest' | null
  ambient_volume          numeric not null default 0.5 check (ambient_volume >= 0 and ambient_volume <= 1),
  ambient_loop            boolean not null default true,
  -- lofi prefs
  lofi_station            text not null default 'deep_focus',
  lofi_source             text not null default 'youtube' check (lofi_source in ('youtube', 'spotify')),
  -- daily goals
  daily_goal_hours        numeric not null default 4,
  daily_goal_pomodoros    integer not null default 8,
  daily_goal_tasks        integer not null default 5,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.focus_preferences enable row level security;

drop policy if exists "focus prefs owner access" on public.focus_preferences;
create policy "focus prefs owner access" on public.focus_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 2. focus_sessions  (immutable-ish log of every timer run)
-- ---------------------------------------------------------------------
create table if not exists public.focus_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  mode            text not null default 'focus'
                    check (mode in ('focus', 'short_break', 'long_break')),
  duration_minutes integer not null default 0,
  completed       boolean not null default true,
  xp_earned       integer not null default 0,
  task_id         uuid references public.study_tasks(id) on delete set null,
  task_label      text,
  notes           text,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists focus_sessions_user_created_idx
  on public.focus_sessions (user_id, created_at desc);

alter table public.focus_sessions enable row level security;

drop policy if exists "focus sessions owner access" on public.focus_sessions;
create policy "focus sessions owner access" on public.focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 3. focus_daily_stats  (one row per user per day — powers charts/heatmap)
-- ---------------------------------------------------------------------
create table if not exists public.focus_daily_stats (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  date              date not null,
  focus_minutes     integer not null default 0,
  sessions_completed integer not null default 0,
  pomodoros         integer not null default 0,
  tasks_completed   integer not null default 0,
  xp_earned         integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists focus_daily_stats_user_date_idx
  on public.focus_daily_stats (user_id, date desc);

alter table public.focus_daily_stats enable row level security;

drop policy if exists "focus daily stats owner access" on public.focus_daily_stats;
create policy "focus daily stats owner access" on public.focus_daily_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 4. focus_achievements  (unlocked badges — one row per badge per user)
-- ---------------------------------------------------------------------
create table if not exists public.focus_achievements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null,
  unlocked_at     timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create index if not exists focus_achievements_user_idx
  on public.focus_achievements (user_id);

alter table public.focus_achievements enable row level security;

drop policy if exists "focus achievements owner access" on public.focus_achievements;
create policy "focus achievements owner access" on public.focus_achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 5. updated_at trigger helper (shared)
-- ---------------------------------------------------------------------
create or replace function public.focus_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists focus_preferences_set_updated_at on public.focus_preferences;
create trigger focus_preferences_set_updated_at
  before update on public.focus_preferences
  for each row execute function public.focus_set_updated_at();

drop trigger if exists focus_daily_stats_set_updated_at on public.focus_daily_stats;
create trigger focus_daily_stats_set_updated_at
  before update on public.focus_daily_stats
  for each row execute function public.focus_set_updated_at();

-- ---------------------------------------------------------------------
-- 6. RPC: atomically increment a day's stats (avoids read-modify-write races)
--     Usage from client:
--       supabase.rpc('increment_focus_daily_stats', { p_date, p_focus_minutes, ... })
-- ---------------------------------------------------------------------
create or replace function public.increment_focus_daily_stats(
  p_date date,
  p_focus_minutes integer default 0,
  p_sessions_completed integer default 0,
  p_pomodoros integer default 0,
  p_tasks_completed integer default 0,
  p_xp_earned integer default 0
)
returns public.focus_daily_stats as $$
declare
  result public.focus_daily_stats;
begin
  insert into public.focus_daily_stats as fds
    (user_id, date, focus_minutes, sessions_completed, pomodoros, tasks_completed, xp_earned)
  values
    (auth.uid(), p_date, p_focus_minutes, p_sessions_completed, p_pomodoros, p_tasks_completed, p_xp_earned)
  on conflict (user_id, date) do update set
    focus_minutes      = fds.focus_minutes + excluded.focus_minutes,
    sessions_completed = fds.sessions_completed + excluded.sessions_completed,
    pomodoros          = fds.pomodoros + excluded.pomodoros,
    tasks_completed    = fds.tasks_completed + excluded.tasks_completed,
    xp_earned          = fds.xp_earned + excluded.xp_earned
  returning * into result;

  return result;
end;
$$ language plpgsql security definer;

-- =====================================================================
--  Done. Tables: focus_preferences, focus_sessions, focus_daily_stats,
--  focus_achievements  +  RPC increment_focus_daily_stats.
-- =====================================================================
