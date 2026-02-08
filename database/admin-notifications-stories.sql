-- ======================================================================================
-- ClassroomX SOCIAL & ADMIN OVERHAUL
-- ======================================================================================

-- 1. Story Interactions
CREATE TABLE IF NOT EXISTS story_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
    viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS story_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, user_id)
);

CREATE TABLE IF NOT EXISTS story_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Admin Broadcasts
CREATE TABLE IF NOT EXISTS admin_broadcasts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_role TEXT DEFAULT 'all', -- 'all', 'student', 'teacher'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Trigger for Auto-Generated App Notifications
-- This can be used for things like "Welcome", "Milestone", etc.
CREATE OR REPLACE FUNCTION trigger_auto_notification() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, content, is_read)
    VALUES (NEW.id, 'system', 'Welcome to ClassroomX! 🎓 Your journey starts here.', false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only run if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_user_created_notify') THEN
        CREATE TRIGGER on_user_created_notify
        AFTER INSERT ON profiles
        FOR EACH ROW
        EXECUTE FUNCTION trigger_auto_notification();
    END IF;
END $$;

-- 4. RLS for new tables
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story Views Viewable" ON story_views FOR SELECT USING (true);
CREATE POLICY "Story Views Insert" ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Story Likes Viewable" ON story_likes FOR SELECT USING (true);
CREATE POLICY "Story Likes Toggle" ON story_likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Story Comments Viewable" ON story_comments FOR SELECT USING (true);
CREATE POLICY "Story Comments Insert" ON story_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin Broadcasts Viewable" ON admin_broadcasts FOR SELECT USING (true);
CREATE POLICY "Admin Broadcasts Insert" ON admin_broadcasts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Real-time Publication
ALTER PUBLICATION supabase_realtime ADD TABLE story_views;
ALTER PUBLICATION supabase_realtime ADD TABLE story_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE story_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_broadcasts;
