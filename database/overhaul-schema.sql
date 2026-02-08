-- ======================================================================================
-- ClassroomX FUNCTIONAL OVERHAUL - DATABASE SCHEMA EXPANSION
-- ======================================================================================

-- 1. STORIES SYSTEM
CREATE TABLE IF NOT EXISTS stories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    content TEXT, -- Text overlay
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
    viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, viewer_id)
);

-- 2. UNIVERSAL MENTION SYSTEM
CREATE TABLE IF NOT EXISTS mentions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentioned_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure a mention is linked to something
    CONSTRAINT mention_target_check CHECK (
        (post_id IS NOT NULL) OR (story_id IS NOT NULL) OR (comment_id IS NOT NULL)
    )
);

-- 3. BEST FRIEND REQUEST SYSTEM (MOVE FROM SIMPLE TOGGLE TO REQUEST FLOW)
CREATE TABLE IF NOT EXISTS best_friend_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

-- 4. USER SETTINGS (PERSISTENCE)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
    notification_prefs JSONB DEFAULT '{"likes": true, "comments": true, "mentions": true, "stories": true, "bf_requests": true}',
    privacy_visibility TEXT DEFAULT 'class' CHECK (privacy_visibility IN ('class', 'friends', 'private')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE best_friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Stories: Visible to all classmates (standard for the batch app)
CREATE POLICY "Stories View" ON stories FOR SELECT USING (true);
CREATE POLICY "Stories Create" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Stories Delete" ON stories FOR DELETE USING (auth.uid() = user_id);

-- Story Views: Viewer can create, story owner can see
CREATE POLICY "Story Views Create" ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);
CREATE POLICY "Story Views Read" ON story_views FOR SELECT USING (
    auth.uid() = viewer_id OR 
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
);

-- Mentions: Anyone can see, author can create
CREATE POLICY "Mentions View" ON mentions FOR SELECT USING (true);
CREATE POLICY "Mentions Create" ON mentions FOR INSERT WITH CHECK (auth.uid() = author_id);

-- BF Requests: Involved parties can see/manage
CREATE POLICY "BF Requests View" ON best_friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "BF Requests Manage" ON best_friend_requests FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- User Settings: Only owner can manage
CREATE POLICY "Settings self manage" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX idx_stories_expires ON stories (expires_at);
CREATE INDEX idx_mentions_post ON mentions (post_id);
CREATE INDEX idx_mentions_story ON mentions (story_id);
CREATE INDEX idx_bf_requests_receiver ON best_friend_requests (receiver_id);

-- 7. NOTIFICATIONS EXTENSION (ADD MENTION AND BF TYPES)
-- (Assuming notifications table already has a check constraint for TYPE, let's update it if needed)
-- Note: Supabase doesn't easily allow altering existing enum-like check constraints without dropping them.
-- If the notifications table from previous setup didn't include these, the INSERT might fail.
-- Let's ensure the notification types are updated.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('like', 'comment', 'tag', 'capsule', 'letter', 'message', 'mention', 'bf_request', 'bf_accept'));
