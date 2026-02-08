-- ======================================================================================
-- BESTIE SYSTEM OVERHAUL (V2): ROBUST & FEATURE-RICH
-- 1. Adds 'current_status' for the "Right Now" feature
-- 2. Unifies Bestie flow (Request -> Accept)
-- 3. Handles profiles vs private_profiles for roles
-- 4. Corrects notification types
-- ======================================================================================

-- A. PROFILE EXTENSIONS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='current_status') THEN
        ALTER TABLE profiles ADD COLUMN current_status TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='friends_count') THEN
        ALTER TABLE profiles ADD COLUMN friends_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- B. TABLES (Ensure they exist)
CREATE TABLE IF NOT EXISTS best_friend_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS best_friends (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- C. RLS POLICIES
ALTER TABLE best_friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE best_friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requests View" ON best_friend_requests;
CREATE POLICY "Requests View" ON best_friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Requests Insert" ON best_friend_requests;
CREATE POLICY "Requests Insert" ON best_friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Requests Update" ON best_friend_requests;
CREATE POLICY "Requests Update" ON best_friend_requests FOR UPDATE USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Friends View" ON best_friends;
CREATE POLICY "Friends View" ON best_friends FOR SELECT USING (true);

DROP POLICY IF EXISTS "Friends Manage" ON best_friends;
CREATE POLICY "Friends Manage" ON best_friends FOR ALL USING (auth.uid() = user_id);

-- D. ROBUST TRIGGER FUNCTION (V2)
CREATE OR REPLACE FUNCTION handle_bestie_request()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Handle NEW REQUEST (INSERT)
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO notifications (user_id, actor_id, type, reference_id, content)
    VALUES (NEW.receiver_id, NEW.sender_id, 'bf_request', NEW.id, 'sent you a bestie request! 💖');
    RETURN NEW;
  
  -- 2. Handle ACCEPTANCE (UPDATE)
  ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending') THEN
    -- Create Double Link in best_friends
    INSERT INTO best_friends (user_id, friend_id) VALUES (NEW.sender_id, NEW.receiver_id) ON CONFLICT DO NOTHING;
    INSERT INTO best_friends (user_id, friend_id) VALUES (NEW.receiver_id, NEW.sender_id) ON CONFLICT DO NOTHING;
    
    -- Update friend counts
    UPDATE profiles SET friends_count = (SELECT count(*) FROM best_friends WHERE user_id = NEW.sender_id) WHERE id = NEW.sender_id;
    UPDATE profiles SET friends_count = (SELECT count(*) FROM best_friends WHERE user_id = NEW.receiver_id) WHERE id = NEW.receiver_id;
    
    -- Notify original sender
    INSERT INTO notifications (user_id, actor_id, type, reference_id, content)
    VALUES (NEW.sender_id, NEW.receiver_id, 'bf_accept', NEW.id, 'accepted your bestie request! 🎉');
    
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_bestie_request_change ON best_friend_requests;
CREATE TRIGGER on_bestie_request_change
  AFTER INSERT OR UPDATE ON best_friend_requests
  FOR EACH ROW EXECUTE FUNCTION handle_bestie_request();

-- E. PERMISSIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON best_friend_requests TO authenticated;
GRANT SELECT, INSERT, DELETE ON best_friends TO authenticated;
