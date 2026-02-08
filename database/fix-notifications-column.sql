-- 1. Add the content column
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS content TEXT;

-- 2. Update Notification Types (Ensure 'broadcast' and 'system' are included)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'tag', 'capsule', 'letter', 'message', 'mention', 'bf_request', 'bf_accept', 'broadcast', 'system'));

-- 3. Fan-out Function for Admin Broadcasts (including reference_id)
CREATE OR REPLACE FUNCTION handle_admin_broadcast_fan_out()
RETURNS TRIGGER AS $$
BEGIN
    -- For 'all' role
    IF NEW.target_role = 'all' THEN
        INSERT INTO notifications (user_id, type, content, actor_id, reference_id, is_read)
        SELECT id, 'broadcast', NEW.title, NEW.admin_id, NEW.id, false
        FROM profiles
        WHERE id != NEW.admin_id;
    
    -- For specific roles
    ELSE
        INSERT INTO notifications (user_id, type, content, actor_id, reference_id, is_read)
        SELECT id, 'broadcast', NEW.title, NEW.admin_id, NEW.id, false
        FROM profiles
        WHERE role = NEW.target_role AND id != NEW.admin_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the welcome trigger
CREATE OR REPLACE FUNCTION trigger_auto_notification() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, content, is_read)
    VALUES (NEW.id, 'system', 'Welcome to ClassroomX! 🎓 Your journey starts here.', false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
