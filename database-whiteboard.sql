-- Create the whiteboards table in the public schema
create table if not exists public.whiteboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  actions jsonb not null default '[]'::jsonb,
  bg_mode text not null default 'blackboard' check (bg_mode in ('whiteboard', 'blackboard')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS) on the whiteboards table
alter table public.whiteboards enable row level security;

-- Drop existing policy if it exists
drop policy if exists "users can manage their own whiteboards" on public.whiteboards;

-- Create policy allowing authenticated users full access to their own whiteboards only
create policy "users can manage their own whiteboards" on public.whiteboards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
