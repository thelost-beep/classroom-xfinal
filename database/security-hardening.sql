-- =====================================================
-- SECURITY HARDENING MIGRATION (V2 - WITH DEPENDENCY FIXES)
-- Isolates sensitive data and tightens RLS
-- =====================================================

-- 1. CREATE PRIVATE PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.private_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  privacy_settings JSONB DEFAULT '{"show_email": false, "show_birthday": false, "show_socials": true}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.private_profiles ENABLE ROW LEVEL SECURITY;

-- 2. MIGRATE DATA (If columns exist in profiles)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
    
    -- A. Copy data to new table
    INSERT INTO public.private_profiles (id, email, role, privacy_settings)
    SELECT id, email, role, privacy_settings FROM public.profiles
    ON CONFLICT (id) DO NOTHING;
    
    -- B. Drop Dependent Policies (Policies that reference profiles.role)
    -- We must drop them before we can drop the column
    DROP POLICY IF EXISTS "Admins Confessions Manage" ON public.confessions;
    DROP POLICY IF EXISTS "Teachers Manage Letters" ON public.teacher_letters;
    DROP POLICY IF EXISTS "Admin Broadcasts Insert" ON public.admin_broadcasts;
    DROP POLICY IF EXISTS "Admins can view reports" ON public.post_reports;
    DROP POLICY IF EXISTS "Admins can update reports" ON public.post_reports;
    
    -- C. Remove sensitive columns from profiles
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS email CASCADE;
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS privacy_settings CASCADE;
  END IF;
END $$;

-- 3. POLICIES FOR PRIVATE PROFILES
CREATE POLICY "Users can view own private profile" 
  ON public.private_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own private profile" 
  ON public.private_profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 4. RECREATE DEPENDENT POLICIES (Using private_profiles)

-- Confessions (Admins manage)
CREATE POLICY "Admins Confessions Manage" ON public.confessions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.private_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Teacher Letters (Teachers manage)
CREATE POLICY "Teachers Manage Letters" ON public.teacher_letters
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.private_profiles WHERE id = auth.uid() AND role = 'teacher')
    );

-- Admin Broadcasts (Admins insert)
CREATE POLICY "Admin Broadcasts Insert" ON public.admin_broadcasts
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.private_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Post Reports (Admins view/update)
CREATE POLICY "Admins can view reports" ON public.post_reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.private_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update reports" ON public.post_reports
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.private_profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- 5. UPDATE ADMIN FUNCTIONS (To use private_profiles)
CREATE OR REPLACE FUNCTION admin_update_user(
    target_user_id UUID,
    new_email TEXT,
    new_role TEXT,
    new_name TEXT
) RETURNS VOID AS $$
BEGIN
    -- Permission Check
    IF NOT EXISTS (SELECT 1 FROM private_profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access Denied: Only admins can manage users.';
    END IF;

    -- Update Auth Email
    UPDATE auth.users 
    SET email = new_email, updated_at = now()
    WHERE id = target_user_id;

    -- Update Public Profile
    UPDATE profiles 
    SET name = new_name
    WHERE id = target_user_id;

    -- Update Private Profile
    UPDATE private_profiles 
    SET email = new_email, role = new_role
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_create_user(
    user_email TEXT,
    user_password TEXT,
    user_name TEXT,
    user_role TEXT DEFAULT 'student'
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Permission Check
    IF NOT EXISTS (SELECT 1 FROM private_profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access Denied: Only admins can create users.';
    END IF;

    -- Reuse creation logic (assuming create_classroom_user handles the split correctly or we delegate)
    -- Since create_classroom_user inserts into auth.users, and the Trigger handles the split, this is fine.
    SELECT create_classroom_user(user_email, user_password, user_name, user_role) INTO new_user_id;
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. TIGHTEN PROFILES RLS
DROP POLICY IF EXISTS "Public Profiles View" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (true);

-- 7. TIGHTEN MESSAGES RLS
DROP POLICY IF EXISTS "Messages View" ON public.messages;
CREATE POLICY "Messages are viewable by participants only" 
  ON public.messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants 
      WHERE chat_id = messages.chat_id AND user_id = auth.uid()
    )
  );

-- 8. TIGHTEN BEST FRIENDS RLS
DROP POLICY IF EXISTS "Friends View" ON public.best_friends;
CREATE POLICY "Friends visible to self and friend" 
  ON public.best_friends FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 9. UPDATE PROFILE TRIGGER (The most important part)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public profiles (Safe data)
  INSERT INTO public.profiles (id, name, avatar_url, is_first_login)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
    new.raw_user_meta_data->>'avatar_url',
    true
  );

  -- Insert into private profiles (Sensitive data)
  INSERT INTO public.private_profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
