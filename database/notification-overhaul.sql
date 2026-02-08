-- ======================================================================================
-- ClassroomX NOTIFICATION OVERHAUL & BROADCAST FAN-OUT
-- ======================================================================================

-- 1. Update Notification Types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'tag', 'capsule', 'letter', 'message', 'mention', 'bf_request', 'bf_accept', 'broadcast', 'system'));

-- 2. Fan-out Function for Admin Broadcasts
CREATE OR REPLACE FUNCTION handle_admin_broadcast_fan_out()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- For 'all' role
    IF NEW.target_role = 'all' THEN
        INSERT INTO notifications (user_id, type, content, actor_id, is_read)
        SELECT id, 'broadcast', NEW.title, NEW.admin_id, false
        FROM profiles
        WHERE id != NEW.admin_id; -- Don't notify the admin who sent it
    
    -- For specific roles
    ELSE
        INSERT INTO notifications (user_id, type, content, actor_id, is_read)
        SELECT id, 'broadcast', NEW.title, NEW.admin_id, false
        FROM profiles
        WHERE role = NEW.target_role AND id != NEW.admin_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for Admin Broadcasts
DROP TRIGGER IF EXISTS on_broadcast_created ON admin_broadcasts;
CREATE TRIGGER on_broadcast_created
AFTER INSERT ON admin_broadcasts
FOR EACH ROW
EXECUTE FUNCTION handle_admin_broadcast_fan_out();

-- 4. Ensure Real-time for Notifications
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN
    NULL; -- In case it's already added
END $$;
