-- =====================================================================
--  StudyFlow AI · Notifications & Reminder Center
--  Run this entire file in the Supabase SQL editor.
--  Safe to re-run (idempotent).
-- =====================================================================

-- shared updated_at helper (re-created so this file is self-contained)
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- 1. notifications  (in-app notification feed)
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null default 'info',
  title        text not null,
  body         text,
  link         text,
  tag          text,          -- stable key for de-duplicating generated reminders
  read         boolean not null default false,
  snooze_until timestamptz,   -- when set in the future the item is hidden until then
  created_at   timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_tag_idx
  on public.notifications (user_id, tag);

alter table public.notifications enable row level security;

drop policy if exists "notifications owner access" on public.notifications;
create policy "notifications owner access" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- live updates for the bell (no-op if realtime publication is unavailable)
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- ---------------------------------------------------------------------
-- 2. notification_settings  (one row per user — reminder preferences)
-- ---------------------------------------------------------------------
create table if not exists public.notification_settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  browser_enabled boolean not null default true,
  deadlines       boolean not null default true,
  overdue         boolean not null default true,
  pomodoro        boolean not null default true,
  focus_reminders boolean not null default true,
  daily_summary   boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

drop policy if exists "notification settings owner access" on public.notification_settings;
create policy "notification settings owner access" on public.notification_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists notification_settings_set_updated_at on public.notification_settings;
create trigger notification_settings_set_updated_at
  before update on public.notification_settings
  for each row execute function public.handle_updated_at();

-- =====================================================================
--  Done. Tables: notifications, notification_settings.
-- =====================================================================
