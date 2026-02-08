-- ======================================================================================
-- ADMIN NOTIFICATIONS V2: SOUNDS & PROPAGATION
-- ======================================================================================

-- 1. Add sound column to tables
-- We use DO block to avoid errors if column exists (Postgres < 9.6 doesn't support IF NOT EXISTS for columns inline easily, but Supabase is recent)
-- Supabase Postgres 13+ supports IF NOT EXISTS for columns? No, standard SQL doesn't often.
-- We'll just try to add it.
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE admin_broadcasts ADD COLUMN sound TEXT DEFAULT 'default';
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE notifications ADD COLUMN sound TEXT DEFAULT 'default';
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- 2. Trigger Function to Propagate Broadcasts to User Notifications
CREATE OR REPLACE FUNCTION propagate_admin_broadcast()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notifications for all matching users
    -- Including the 'sound' parameter
    INSERT INTO notifications (user_id, type, content, is_read, sound)
    SELECT id, 'broadcast', NEW.title || ': ' || NEW.content, false, NEW.sound
    FROM profiles
    WHERE (NEW.target_role = 'all' OR role = NEW.target_role);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS on_broadcast_created ON admin_broadcasts;
CREATE TRIGGER on_broadcast_created
AFTER INSERT ON admin_broadcasts
FOR EACH ROW
EXECUTE FUNCTION propagate_admin_broadcast();
