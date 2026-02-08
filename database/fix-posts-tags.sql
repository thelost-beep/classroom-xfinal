-- ======================================================================================
-- FINAL FIX: POSTING & TAGGING NOTIFICATIONS
-- ======================================================================================

-- 1. Relax Post Type Constraint
-- First, drop the old constraint
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_post_type_check;
-- Add a more flexible one
ALTER TABLE posts ADD CONSTRAINT posts_post_type_check 
CHECK (post_type IN ('memory', 'photo', 'secret', 'capsule', 'teacher_letter', 'moment', 'update'));

-- 2. Ensure Notification Types include 'tag'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'tag', 'capsule', 'letter', 'message', 'mention', 'bf_request', 'bf_accept', 'broadcast', 'system'));

-- 3. Trigger for Tag Notifications
CREATE OR REPLACE FUNCTION handle_tag_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_author_name TEXT;
BEGIN
    -- Get the name of the person who made the post
    SELECT p.name INTO post_author_name 
    FROM profiles p
    JOIN posts pst ON pst.user_id = p.id
    WHERE pst.id = NEW.post_id;

    INSERT INTO notifications (user_id, type, content, actor_id, reference_id, is_read)
    VALUES (
        NEW.tagged_user_id, 
        'tag', 
        'tagged you in a new post!', 
        (SELECT user_id FROM posts WHERE id = NEW.post_id), -- The actor is the post author
        NEW.post_id, 
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_tag_created ON tags;
CREATE TRIGGER on_tag_created
AFTER INSERT ON tags
FOR EACH ROW
EXECUTE FUNCTION handle_tag_notification();

-- 4. Fix for 'content' column if not already fixed (Safety)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'content') THEN
        ALTER TABLE notifications ADD COLUMN content TEXT;
    END IF;
END $$;
