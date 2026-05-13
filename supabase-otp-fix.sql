-- ==========================================
-- SUPABASE OTP AUTH FLOW FIX
-- ==========================================
-- This script ensures that user profiles are ONLY created AFTER 
-- the user has successfully verified their email/OTP.
-- It also handles updating profiles if information changes.

-- 1. Clean up old triggers/functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create the robust profile handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_confirmed BOOLEAN;
BEGIN
    -- Check if the email is confirmed in the current record
    is_confirmed := NEW.email_confirmed_at IS NOT NULL;

    -- LOGIC:
    -- We only want to create the profile row when the user is actually verified.
    -- In the OTP flow:
    -- 1. Initial OTP request: INSERT into auth.users (email_confirmed_at is NULL) -> DO NOTHING
    -- 2. OTP Verification: UPDATE auth.users (email_confirmed_at is set) -> CREATE PROFILE
    
    IF is_confirmed THEN
        -- Check if it's the first time it's being confirmed (transition from NULL to value)
        -- Or if it's an INSERT that is already confirmed (e.g. Social Login or Admin)
        IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NULL) THEN
            INSERT INTO public.profiles (id, email, full_name, avatar_url)
            VALUES (
                NEW.id, 
                NEW.email, 
                COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
                COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
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

-- 3. Create the trigger to monitor auth.users
CREATE TRIGGER on_auth_user_confirmed
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Verify existing users (Optional: Run this if you have unconfirmed users who you want to clear profiles for)
-- DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email_confirmed_at IS NULL);
