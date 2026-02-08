-- ======================================================================================
-- V3 ADVANCED POST FEATURES: COLLABORATIONS & VIDEO OPTIMIZATION
-- ======================================================================================

-- 1. Create Post Collaborations Table
CREATE TABLE IF NOT EXISTS post_collaborations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    collaborator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, collaborator_id)
);

-- 2. Add Collaboration to Notification Types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'tag', 'capsule', 'letter', 'message', 'mention', 'bf_request', 'bf_accept', 'broadcast', 'system', 'collab_request', 'collab_accept'));

-- 3. RLS for Collaborations
ALTER TABLE post_collaborations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collab View" ON post_collaborations FOR SELECT USING (true);
CREATE POLICY "Collab Manage Own" ON post_collaborations FOR ALL USING (
    auth.uid() = collaborator_id OR 
    auth.uid() = (SELECT user_id FROM posts WHERE id = post_id)
);

-- 4. Trigger for Collaboration Notification
CREATE OR REPLACE FUNCTION handle_collab_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO notifications (user_id, type, content, actor_id, reference_id, is_read)
        VALUES (
            NEW.collaborator_id, 
            'collab_request', 
            'invited you to collaborate on a post!', 
            (SELECT user_id FROM posts WHERE id = NEW.post_id), 
            NEW.post_id, 
            false
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted') THEN
        INSERT INTO notifications (user_id, type, content, actor_id, reference_id, is_read)
        VALUES (
            (SELECT user_id FROM posts WHERE id = NEW.post_id), 
            'collab_accept', 
            'accepted your collaboration invitation!', 
            NEW.collaborator_id, 
            NEW.post_id, 
            false
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
