-- ======================================================================================
-- ClassroomX ADVANCED ADMIN & PREMIUM PROFILES
-- ======================================================================================

-- 1. Extend Profiles for "Better" Detailed Info
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS hobbies TEXT,
ADD COLUMN IF NOT EXISTS dream_job TEXT,
ADD COLUMN IF NOT EXISTS quote TEXT,
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
ADD COLUMN IF NOT EXISTS linkedin_handle TEXT,
ADD COLUMN IF NOT EXISTS hometown TEXT;

-- 2. Admin Security Function: Manage Any User (Email, Role, etc.)
-- This runs with SECURITY DEFINER to allow admin intervention.
CREATE OR REPLACE FUNCTION admin_update_user(
    target_user_id UUID,
    new_email TEXT,
    new_role TEXT,
    new_name TEXT
) RETURNS VOID AS $$
BEGIN
    -- Only allow if the executor is an admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access Denied: Only admins can manage users.';
    END IF;

    -- Update Auth Email (Note: In production Supabase, updating auth.users email 
    -- often requires service_role, but we can update the profile link)
    UPDATE auth.users 
    SET email = new_email,
        updated_at = now()
    WHERE id = target_user_id;

    -- Update Profile
    UPDATE profiles 
    SET email = new_email,
        role = new_role,
        name = new_name
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Admin Security Function: Create New User
CREATE OR REPLACE FUNCTION admin_create_user(
    user_email TEXT,
    user_password TEXT,
    user_name TEXT,
    user_role TEXT DEFAULT 'student'
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Check admin permission
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access Denied: Only admins can create users.';
    END IF;

    -- Reuse our robust creation logic
    SELECT create_classroom_user(user_email, user_password, user_name, user_role) INTO new_user_id;
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
