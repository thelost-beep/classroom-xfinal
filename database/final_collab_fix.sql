-- 1. Ensure processed column exists in notifications
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'notifications' AND COLUMN_NAME = 'processed') THEN
        ALTER TABLE notifications ADD COLUMN processed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Create index on processed for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_processed ON notifications(processed);

-- 3. Update notifications type constraint to include collaboration types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'tag', 'capsule', 'letter', 'message', 'mention', 'bf_request', 'bf_accept', 'broadcast', 'system', 'collab_request', 'collab_accept'));

-- 4. Create post_collaborations if not exists
CREATE TABLE IF NOT EXISTS post_collaborations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    collaborator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, collaborator_id)
);

-- 5. Enable RLS
ALTER TABLE post_collaborations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Collab View" ON post_collaborations;
CREATE POLICY "Collab View" ON post_collaborations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Collab Manage Own" ON post_collaborations;
CREATE POLICY "Collab Manage Own" ON post_collaborations FOR ALL USING (
    auth.uid() = collaborator_id OR 
    auth.uid() = (SELECT user_id FROM posts WHERE id = post_id)
);

-- 6. Trigger for Notifications
CREATE OR REPLACE FUNCTION handle_collab_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO notifications (user_id, type, actor_id, reference_id, is_read, processed)
        VALUES (
            NEW.collaborator_id, 
            'collab_request', 
            (SELECT user_id FROM posts WHERE id = NEW.post_id), 
            NEW.post_id, 
            false,
            false
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted') THEN
        INSERT INTO notifications (user_id, type, actor_id, reference_id, is_read, processed)
        VALUES (
            (SELECT user_id FROM posts WHERE id = NEW.post_id), 
            'collab_accept', 
            NEW.collaborator_id, 
            NEW.post_id, 
            false,
            true
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_collab_changed ON post_collaborations;
CREATE TRIGGER on_collab_changed
AFTER INSERT OR UPDATE ON post_collaborations
FOR EACH ROW
EXECUTE FUNCTION handle_collab_notification();
