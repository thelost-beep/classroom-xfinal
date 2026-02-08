-- ======================================================================================
-- ClassroomX SOCIAL PLUS: UNIFIED FEED, PRIVACY & BESTIES
-- ======================================================================================

-- 1. Extend Profiles for Privacy and Networking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"show_email": true, "show_phone": false, "show_birthday": true, "show_socials": true}',
ADD COLUMN IF NOT EXISTS besties UUID[] DEFAULT '{}';

-- 2. Create a specific bucket for Avatars if not exists (Handled via Dashboard usually, but added here for safety)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- 3. RLS for Avatar Bucket (Allow anyone to view, owner to upload)
CREATE POLICY "Public Avatar View" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Owner Avatar Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Unified Feed Helper: A view that mixes posts and approved confessions
-- Note: Confessions don't have media, so we'll handle the type on the frontend
CREATE OR REPLACE VIEW unified_feed_items AS
SELECT 
    id, 
    user_id, 
    content, 
    'post' as item_type, 
    created_at,
    (SELECT count(*) FROM likes WHERE post_id = posts.id) as weight
FROM posts
UNION ALL
SELECT 
    id, 
    user_id, 
    content, 
    'confession' as item_type, 
    created_at,
    0 as weight -- Confessions start with 0 weight, but are marked approved
FROM confessions
WHERE status = 'approved';
