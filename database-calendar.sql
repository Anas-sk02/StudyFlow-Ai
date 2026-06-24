-- =====================================================================
--  StudyFlow AI · Calendar
--  Run this entire file in the Supabase SQL editor.
--  Safe to re-run (idempotent): uses IF NOT EXISTS / DROP POLICY IF EXISTS.
-- =====================================================================

-- ---------------------------------------------------------------------
--  shared updated_at trigger helper (re-created so this file is self-contained)
-- ---------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- 1. study_events  (scheduled study blocks, exams, classes, revision)
-- ---------------------------------------------------------------------
create table if not exists public.study_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  subject     text,
  kind        text not null default 'study'
                check (kind in ('study', 'exam', 'class', 'revision', 'break')),
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  notes       text,
  color       text not null default 'indigo',
  task_id     uuid references public.study_tasks(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists study_events_user_start_idx
  on public.study_events (user_id, start_at);

alter table public.study_events enable row level security;

drop policy if exists "study events owner access" on public.study_events;
create policy "study events owner access" on public.study_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists study_events_set_updated_at on public.study_events;
create trigger study_events_set_updated_at
  before update on public.study_events
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------
-- 2. study_block_templates  (re-usable presets for quick scheduling)
-- ---------------------------------------------------------------------
create table if not exists public.study_block_templates (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  subject          text,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  color            text not null default 'indigo',
  kind             text not null default 'study'
                     check (kind in ('study', 'exam', 'class', 'revision', 'break')),
  created_at       timestamptz not null default now()
);

create index if not exists study_block_templates_user_idx
  on public.study_block_templates (user_id);

alter table public.study_block_templates enable row level security;

drop policy if exists "study block templates owner access" on public.study_block_templates;
create policy "study block templates owner access" on public.study_block_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
--  Done. Tables: study_events, study_block_templates.
-- =====================================================================
