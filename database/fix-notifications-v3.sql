-- ======================================================================================
-- MASTER NOTIFICATION FIX (V5): UNIFIED & SECURE
-- 1. Cleans up old triggers
-- 2. Ensures schema consistency (content, sound, etc)
-- 3. Implements robust propagation (handles profiles vs private_profiles)
-- 4. ADDS MISSING RLS POLICIES (Critical for delivery)
-- ======================================================================================

-- A. SCHEMA POLISH
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'tag', 'capsule', 'letter', 'message', 'mention', 'bf_request', 'bf_accept', 'broadcast', 'system'));

-- Ensure columns exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='content') THEN
        ALTER TABLE notifications ADD COLUMN content TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='sound') THEN
        ALTER TABLE notifications ADD COLUMN sound TEXT DEFAULT 'default';
    END IF;
END $$;

-- B. TRIGGER CLEANUP (Remove all possible conflicting trigger names)
DROP TRIGGER IF EXISTS on_broadcast_created ON admin_broadcasts;
DROP TRIGGER IF EXISTS handle_broadcast_fan_out ON admin_broadcasts;
DROP TRIGGER IF EXISTS admin_broadcast_trigger ON admin_broadcasts;

-- C. ROBUST PROPAGATION FUNCTION (V5)
CREATE OR REPLACE FUNCTION propagate_admin_broadcast()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if private_profiles exists (Hardened state)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'private_profiles'
    ) THEN
        EXECUTE format('
            INSERT INTO notifications (user_id, type, actor_id, content, is_read, sound, reference_id)
            SELECT id, %L, %L, %L, false, %L, %L
            FROM public.private_profiles
            WHERE (%L = ''all'' OR role = %L) AND id != %L',
            'broadcast', NEW.admin_id, NEW.title || ': ' || NEW.content, NEW.sound, NEW.id, NEW.target_role, NEW.target_role, NEW.admin_id);
    ELSE
        -- Fallback (Legacy state)
        INSERT INTO notifications (user_id, type, actor_id, content, is_read, sound, reference_id)
        SELECT id, 'broadcast', NEW.admin_id, NEW.title || ': ' || NEW.content, false, NEW.sound, NEW.id
        FROM public.profiles
        WHERE (NEW.target_role = 'all' OR role = NEW.target_role) AND id != NEW.admin_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the master trigger
CREATE TRIGGER on_broadcast_created
AFTER INSERT ON admin_broadcasts
FOR EACH ROW
EXECUTE FUNCTION propagate_admin_broadcast();

-- D. RLS POLICIES (THE MISSING LINK)
-- Enable RLS just in case it was toggled off or inconsistent
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (to mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- E. REALTIME ENABLEMENT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
