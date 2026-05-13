-- 1. Ensure profiles table exists with all required columns
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  username text,
  avatar_url text,
  bio text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Add missing columns safely if the table already exists
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='email') then
    alter table public.profiles add column email text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='full_name') then
    alter table public.profiles add column full_name text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='username') then
    alter table public.profiles add column username text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='avatar_url') then
    alter table public.profiles add column avatar_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='bio') then
    alter table public.profiles add column bio text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='updated_at') then
    alter table public.profiles add column updated_at timestamp with time zone default timezone('utc'::text, now());
  end if;
end $$;

-- 3. Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Drop existing policies to avoid errors
drop policy if exists "Public profiles are viewable by everyone." on profiles;
drop policy if exists "Users can insert their own profile." on profiles;
drop policy if exists "Users can update own profile." on profiles;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- 4. Create trigger to update updated_at automatically
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- 5. Trigger to create a profile entry when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Setup Storage for Avatars
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly accessible." on storage.objects;
drop policy if exists "Anyone can upload an avatar." on storage.objects;
drop policy if exists "Anyone can update their own avatar." on storage.objects;

create policy "Avatar images are publicly accessible." on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Anyone can upload an avatar." on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Anyone can update their own avatar." on storage.objects
  for update using (auth.uid() = owner) with check (bucket_id = 'avatars');

-- 7. Add author_name to messages for chat display
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='messages' and column_name='author_name') then
    alter table public.messages add column author_name text;
  end if;
end $$;

-- 8. Documents table for AI PDF system
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  file_name text not null,
  file_url text not null,
  file_size bigint not null,
  extracted_text text,
  summary text,
  topics text[],
  revision_notes text,
  key_points text[],
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 9. Upload usage tracking
create table if not exists public.upload_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  upload_date date default current_date not null,
  upload_count int default 0 not null,
  unique(user_id, upload_date)
);

-- 10. RLS for documents
alter table public.documents enable row level security;
drop policy if exists "Users can view their own documents." on documents;
drop policy if exists "Users can insert their own documents." on documents;
drop policy if exists "Users can delete their own documents." on documents;

create policy "Users can view their own documents." on documents for select using (auth.uid() = user_id);
create policy "Users can insert their own documents." on documents for insert with check (auth.uid() = user_id);
create policy "Users can delete their own documents." on documents for delete using (auth.uid() = user_id);

-- 11. RLS for upload_usage
alter table public.upload_usage enable row level security;
drop policy if exists "Users can view their own usage." on upload_usage;
create policy "Users can view their own usage." on upload_usage for select using (auth.uid() = user_id);

-- 12. Storage Bucket for Documents
insert into storage.buckets (id, name, public) values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "Document files are publicly accessible." on storage.objects;
drop policy if exists "Authenticated users can upload documents." on storage.objects;
drop policy if exists "Users can delete their own documents." on storage.objects;

create policy "Document files are publicly accessible." on storage.objects
  for select using (bucket_id = 'documents');

create policy "Authenticated users can upload documents." on storage.objects
  for insert with check (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "Users can delete their own documents." on storage.objects
  for delete using (auth.uid() = owner and bucket_id = 'documents');

