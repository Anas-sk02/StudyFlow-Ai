-- Ensure all required columns exist in the profiles table
do $$ 
begin
  -- Base columns
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='email') then
    alter table public.profiles add column email text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='full_name') then
    alter table public.profiles add column full_name text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='username') then
    alter table public.profiles add column username text;
  end if;

  -- Extended profile columns (from Profile interface)
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='university') then
    alter table public.profiles add column university text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='branch') then
    alter table public.profiles add column branch text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='year') then
    alter table public.profiles add column year text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='daily_target_hours') then
    alter table public.profiles add column daily_target_hours int default 4;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='study_streak') then
    alter table public.profiles add column study_streak int default 0;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='goals') then
    alter table public.profiles add column goals text[] default '{}';
  end if;

  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='timezone') then
    alter table public.profiles add column timezone text default 'UTC';
  end if;

end $$;

-- ==========================================
-- SUPABASE OTP AUTH FLOW FIX
-- ==========================================
-- This script ensures that user profiles are ONLY created AFTER 
-- the user has successfully verified their email/OTP.

-- 1. Drop old triggers to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- 2. Improved function that checks for email confirmation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_confirmed BOOLEAN;
BEGIN
    -- Check if the email is confirmed
    is_confirmed := NEW.email_confirmed_at IS NOT NULL;

    -- ONLY create profile if user is confirmed
    -- Transition: OLD confirmed was NULL, NEW confirmed is NOT NULL
    -- OR it's an INSERT with confirmation already set
    IF is_confirmed THEN
        IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NULL) THEN
            INSERT INTO public.profiles (id, email, full_name, avatar_url, study_streak, daily_target_hours, goals, timezone)
            VALUES (
                NEW.id, 
                NEW.email, 
                COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
                COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
                0,
                4,
                '{}',
                'UTC'
            )
            ON CONFLICT (id) DO UPDATE
            SET 
                email = EXCLUDED.email,
                full_name = CASE 
                    WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name 
                    ELSE profiles.full_name 
                END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create trigger for both INSERT and UPDATE
CREATE TRIGGER on_auth_user_confirmed
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
