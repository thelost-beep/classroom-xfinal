-- ======================================================================================
-- FINAL ROBUST FIX: POSTING & TAGGING NOTIFICATIONS
-- ======================================================================================

-- 1. Correct Post Type Constraint Safely
-- First, drop the old constraint if it exists
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_post_type_check;

-- Ensure all existing rows have a valid type (fallback to 'memory' if unknown)
-- This prevents "violated by some row" error
UPDATE posts 
SET post_type = 'memory' 
WHERE post_type NOT IN ('memory', 'photo', 'secret', 'capsule', 'teacher_letter', 'moment', 'update', 'confession');

-- Add the new, broader constraint
ALTER TABLE posts ADD CONSTRAINT posts_post_type_check 
CHECK (post_type IN ('memory', 'photo', 'secret', 'capsule', 'teacher_letter', 'moment', 'update', 'confession'));

-- 2. Ensure Notification Types are inclusive
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'tag', 'capsule', 'letter', 'message', 'mention', 'bf_request', 'bf_accept', 'broadcast', 'system'));

-- 3. Notification Trigger for Tags
CREATE OR REPLACE FUNCTION handle_tag_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, content, actor_id, reference_id, is_read)
    VALUES (
        NEW.tagged_user_id, 
        'tag', 
        'tagged you in a new post!', 
        (SELECT user_id FROM posts WHERE id = NEW.post_id), 
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

-- 4. Ensure 'content' column exists in notifications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'content') THEN
        ALTER TABLE notifications ADD COLUMN content TEXT;
    END IF;
END $$;
