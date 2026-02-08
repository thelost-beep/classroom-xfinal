-- CHAT CRITICAL FIX V1
-- 1. Ensure Class Group Chat Exists
-- 2. Automatically add all users to Class Group
-- 3. Fix RLS policies

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Setup Class Group
DO $$
DECLARE
    v_chat_id UUID;
BEGIN
    -- Check if Class Group exists
    SELECT id INTO v_chat_id FROM chats WHERE name = 'Class Group' LIMIT 1;
    
    -- Create if not exists
    IF v_chat_id IS NULL THEN
        INSERT INTO chats (name, type) VALUES ('Class Group', 'group') RETURNING id INTO v_chat_id;
    END IF;

    -- Add all existing profiles to it (if not already there)
    INSERT INTO chat_participants (chat_id, user_id)
    SELECT v_chat_id, id FROM profiles
    ON CONFLICT (chat_id, user_id) DO NOTHING;
END $$;

-- 2. Trigger for New Users
CREATE OR REPLACE FUNCTION public.handle_auto_join_class_group() 
RETURNS TRIGGER AS $$
DECLARE
    v_class_chat_id UUID;
BEGIN
    SELECT id INTO v_class_chat_id FROM chats WHERE name = 'Class Group' LIMIT 1;
    
    IF v_class_chat_id IS NOT NULL THEN
        INSERT INTO public.chat_participants (chat_id, user_id)
        VALUES (v_class_chat_id, NEW.id)
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_join_class_group ON public.profiles;
CREATE TRIGGER tr_auto_join_class_group 
AFTER INSERT ON public.profiles 
FOR EACH ROW EXECUTE FUNCTION public.handle_auto_join_class_group();

-- 3. Fix RLS for Persistence 
-- Some "circular" exists policies can fail on complex joins. Let's simplify.

DROP POLICY IF EXISTS "Chats View" ON chats;
CREATE POLICY "Chats View" ON chats FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_participants WHERE chat_id = id AND user_id = auth.uid()) OR type = 'group'
);

DROP POLICY IF EXISTS "Chat Participants View" ON chat_participants;
CREATE POLICY "Chat Participants View" ON chat_participants FOR SELECT USING (true); -- Allow seeing who is in a chat

DROP POLICY IF EXISTS "Chat Participants Insert" ON chat_participants;
CREATE POLICY "Chat Participants Manage" ON chat_participants FOR ALL USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM chats WHERE id = chat_id AND type = 'group'
));

-- Ensure messages are always insertable by sender
DROP POLICY IF EXISTS "Messages Insert" ON messages;
CREATE POLICY "Messages Insert" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Messages View" ON messages;
CREATE POLICY "Messages View" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_participants WHERE chat_id = messages.chat_id AND user_id = auth.uid())
);

-- Notify schema change
NOTIFY pgrst, 'reload schema';
