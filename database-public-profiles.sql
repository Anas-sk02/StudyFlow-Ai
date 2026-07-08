-- =====================================================================
-- Public Profiles + Username Search
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times (idempotent).
-- =====================================================================

-- 1. Normalise existing usernames to lowercase and trim spaces so that
--    /u/<username> lookups are predictable and case-insensitive.
update public.profiles
set username = lower(trim(username))
where username is not null
  and username <> lower(trim(username));

-- 2. Enforce a unique (case-insensitive) username so two people can't
--    own the same /u/<username> URL. Uses a unique index on lower(username)
--    and ignores NULLs (users who haven't picked a username yet).
create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

-- 3. Speed up "search users by username / name" queries.
create index if not exists profiles_username_search_idx
  on public.profiles (lower(username));

create index if not exists profiles_fullname_search_idx
  on public.profiles (lower(full_name));

-- 4. RLS: profiles and user_stats are already "viewable by everyone"
--    (see database-setup.sql / database-gamification.sql), so no policy
--    changes are needed for public profile pages. Verify with:
--
--    select tablename, policyname, cmd
--    from pg_policies
--    where tablename in ('profiles', 'user_stats');
--
--    You should see a SELECT policy with USING (true) on both tables.
