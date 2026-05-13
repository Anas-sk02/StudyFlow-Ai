-- Enable UUID generation
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  university text,
  branch text,
  year text,
  bio text,
  avatar_url text,
  goals text[] not null default '{}',
  daily_target_hours numeric not null default 4,
  study_streak int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.study_tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  subject text not null,
  deadline date,
  priority text not null check (priority in ('low', 'medium', 'high')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  estimated_hours numeric not null default 1,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.study_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_payload jsonb not null,
  ai_response jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.study_rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  topic text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.study_rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_email text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  bucket_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.study_tasks enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_rooms enable row level security;
alter table public.messages enable row level security;
alter table public.notes enable row level security;
alter table public.activity_logs enable row level security;

create policy "profile owner access" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "task owner access" on public.study_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "plan owner access" on public.study_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rooms visible to authenticated users" on public.study_rooms
  for select using (auth.role() = 'authenticated');

create policy "authenticated can create rooms" on public.study_rooms
  for insert with check (auth.role() = 'authenticated');

create policy "messages visible to authenticated users" on public.messages
  for select using (auth.role() = 'authenticated');

create policy "authenticated can send messages" on public.messages
  for insert with check (auth.role() = 'authenticated');

create policy "notes owner access" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "activity owner access" on public.activity_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
