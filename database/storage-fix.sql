-- ======================================================================================
-- ClassroomX STORAGE & PRIVACY UPDATE
-- ======================================================================================
-- Paste this in Supabase SQL Editor to fix Post Creation and Profile Visibility.

-- 1. Create Storage Buckets (if they don't exist)
-- Note: Supabase UI is usually better for creating buckets, but we can set policies here.
-- Buckets to create manually in UI: 'post-media', 'avatars'

-- 2. Storage Policies (Allow authenticated users to upload and everyone to view)
DO $$
BEGIN
    -- Only run if storage schema exists
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        
        -- Post Media Policies
        INSERT INTO storage.buckets (id, name, public) 
        VALUES ('post-media', 'post-media', true)
        ON CONFLICT (id) DO UPDATE SET public = true;

        INSERT INTO storage.buckets (id, name, public) 
        VALUES ('avatars', 'avatars', true)
        ON CONFLICT (id) DO UPDATE SET public = true;

        -- Allow Uploads
        DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
        CREATE POLICY "Authenticated Upload" ON storage.objects 
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');

        -- Allow Public View
        DROP POLICY IF EXISTS "Public View" ON storage.objects;
        CREATE POLICY "Public View" ON storage.objects 
        FOR SELECT USING (true);

        -- Allow Update/Delete Own
        DROP POLICY IF EXISTS "Owner Manage" ON storage.objects;
        CREATE POLICY "Owner Manage" ON storage.objects 
        FOR ALL USING (auth.uid() = owner);
    END IF;
END $$;

-- 3. Ensure Profiles are Publicly Visible
DROP POLICY IF EXISTS "Public Profiles View" ON profiles;
CREATE POLICY "Public Profiles View" ON profiles 
FOR SELECT USING (true);

-- 4. Ensure Posts are Visible to authenticated users
DROP POLICY IF EXISTS "Class Posts View" ON posts;
CREATE POLICY "Class Posts View" ON posts 
FOR SELECT USING (auth.role() = 'authenticated');
