-- ==========================================
-- FIX NOTIFICATIONS & BROADCAST SYSTEM
-- ==========================================

-- 1. Update Notifications Table to support text content and sounds directly
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sound TEXT DEFAULT 'default';

-- 2. Update Notifications Type Check Constraint to include 'broadcast'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('like', 'comment', 'tag', 'capsule', 'letter', 'message', 'broadcast', 'system'));

-- 3. Create Admin Broadcasts Table (Source of Truth)
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT DEFAULT 'all', -- 'all', 'student', 'teacher'
  sound TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Trigger Function to Fan-Out Notifications
CREATE OR REPLACE FUNCTION public.handle_new_broadcast()
RETURNS TRIGGER AS $$
DECLARE
  target_user RECORD;
BEGIN
  -- Loop through all users matching the target role
  FOR target_user IN 
    SELECT id FROM profiles 
    WHERE 
      CASE 
        WHEN new.target_role = 'all' THEN true
        ELSE role = new.target_role
      END
  LOOP
    -- Insert notification for each user
    INSERT INTO notifications (
      user_id, 
      actor_id, 
      type, 
      reference_id, 
      content, 
      sound,
      is_read, 
      created_at
    )
    VALUES (
      target_user.id, 
      new.admin_id, 
      'broadcast', 
      new.id, 
      new.content, 
      new.sound,
      false, 
      now()
    );
  END LOOP;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach Trigger to Admin Broadcasts
DROP TRIGGER IF EXISTS on_broadcast_created ON admin_broadcasts;
CREATE TRIGGER on_broadcast_created
  AFTER INSERT ON admin_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_broadcast();

-- 6. RLS Policies for Admin Broadcasts
ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;

-- Only admins can insert broadcasts
CREATE POLICY "Admins can create broadcasts" ON admin_broadcasts
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Admins can view broadcasts
CREATE POLICY "Admins can view broadcasts" ON admin_broadcasts
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );
