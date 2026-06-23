-- Create user_stats table for tracking streaks, XP, level, and focus hours
create table if not exists public.user_stats (
  user_id uuid references auth.users(id) on delete cascade not null primary key,
  xp integer not null default 0,
  level integer not null default 1,
  streak_days integer not null default 0,
  last_activity_date date,
  total_focus_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.user_stats enable row level security;

-- Policies
drop policy if exists "anyone can view user stats" on public.user_stats;
drop policy if exists "users can update their own stats" on public.user_stats;
drop policy if exists "users can insert their own stats" on public.user_stats;

create policy "anyone can view user stats" on public.user_stats
  for select using (true);

create policy "users can update their own stats" on public.user_stats
  for update using (auth.uid() = user_id);

create policy "users can insert their own stats" on public.user_stats
  for insert with check (auth.uid() = user_id);

-- Update the handle_new_user function to automatically create a user_stats entry
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url;

  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  
  return new;
end;
$$ language plpgsql security definer;
