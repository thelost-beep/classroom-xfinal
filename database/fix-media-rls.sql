-- ========================================================
-- FIX: Media Table RLS Policies
-- Solves "new row violates row-level security policy for table media"
-- ========================================================

-- 1. Enable RLS (just to be safe, though already enabled)
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- 2. Create INSERT Policy
-- Only allow users to add media to posts they own
DROP POLICY IF EXISTS "Media Insert" ON public.media;
CREATE POLICY "Media Insert" ON public.media
FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.posts WHERE id = post_id)
);

-- 3. Create UPDATE Policy
DROP POLICY IF EXISTS "Media Update" ON public.media;
CREATE POLICY "Media Update" ON public.media
FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM public.posts WHERE id = post_id)
);

-- 4. Create DELETE Policy
DROP POLICY IF EXISTS "Media Delete" ON public.media;
CREATE POLICY "Media Delete" ON public.media
FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM public.posts WHERE id = post_id)
);

-- 5. Ensure "Select" is open for all (already exists as "Media View")
-- If it doesn't exist, create it:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'media' AND policyname = 'Media View'
    ) THEN
        CREATE POLICY "Media View" ON public.media FOR SELECT USING (true);
    END IF;
END $$;
