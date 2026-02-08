-- ==========================================
-- ClassroomX DB FIX V3
-- Fixes missing 'dob' column and cache issues
-- ==========================================

-- 1. Ensure columns exist in profiles table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='dob') THEN
        ALTER TABLE public.profiles ADD COLUMN dob DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='hometown') THEN
        ALTER TABLE public.profiles ADD COLUMN hometown TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='dream_job') THEN
        ALTER TABLE public.profiles ADD COLUMN dream_job TEXT;
    END IF;
END $$;

-- 2. Force Refresh Schema Cache (Important for PostgREST)
-- Running any DDL refreshes the cache, but we can be explicit
NOTIFY pgrst, 'reload schema';

-- 3. Update RLS to ensure public view is robust
DROP POLICY IF EXISTS "Public Profiles View" ON public.profiles;
CREATE POLICY "Public Profiles View" ON public.profiles 
FOR SELECT 
USING (true);

-- 4. Ensure these columns are included in public view
GRANT SELECT (id, name, avatar_url, bio, hometown, dream_job, dob, role, created_at) ON public.profiles TO anon, authenticated;
