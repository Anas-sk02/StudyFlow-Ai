-- =====================================================================
--  StudyFlow AI · Tasks v3 — recurrence + subtasks
--  Run this entire file in the Supabase SQL editor. Idempotent.
-- =====================================================================

-- 1. recurring tasks ---------------------------------------------------
alter table public.study_tasks
  add column if not exists recurrence text not null default 'none';

-- add the check constraint only once
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'study_tasks_recurrence_check'
  ) then
    alter table public.study_tasks
      add constraint study_tasks_recurrence_check
      check (recurrence in ('none', 'daily', 'weekly', 'monthly'));
  end if;
end $$;

-- 2. subtasks ----------------------------------------------------------
create table if not exists public.subtasks (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.study_tasks(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists subtasks_task_idx on public.subtasks (task_id);

alter table public.subtasks enable row level security;

drop policy if exists "subtasks owner access" on public.subtasks;
create policy "subtasks owner access" on public.subtasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
--  Done. study_tasks.recurrence + subtasks table.
-- =====================================================================
