-- ==========================================
-- CHAT SYSTEM: ULTIMATE RESET & REBUILD
-- Date: 2026-02-08
-- ==========================================

-- 1. CLEANUP (Optional - only if tables are in a broken state, comment out if data must be kept)
-- TRUNCATE chat_participants, messages, chats CASCADE;

-- 2. ENSURE TABLES EXIST WITH CORRECT TYPES
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    type TEXT NOT NULL DEFAULT '1to1' CHECK (type IN ('1to1', 'group')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'post')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(message_id, user_id, emoji)
);

-- 3. CLASS GROUP AUTO-JOINER
-- Ensure the group exists
DO $$
DECLARE
    v_class_group_id UUID;
BEGIN
    SELECT id INTO v_class_group_id FROM public.chats WHERE name = 'Class Group' AND type = 'group' LIMIT 1;
    IF v_class_group_id IS NULL THEN
        INSERT INTO public.chats (name, type) VALUES ('Class Group', 'group') RETURNING id INTO v_class_group_id;
    END IF;

    -- Add all current profiles to Class Group
    INSERT INTO public.chat_participants (chat_id, user_id)
    SELECT v_class_group_id, id FROM public.profiles
    ON CONFLICT DO NOTHING;
END $$;

-- Trigger to add new profiles to Class Group automatically
CREATE OR REPLACE FUNCTION public.join_class_group_on_profile_create()
RETURNS TRIGGER AS $$
DECLARE
    v_class_group_id UUID;
BEGIN
    SELECT id INTO v_class_group_id FROM public.chats WHERE name = 'Class Group' AND type = 'group' LIMIT 1;
    IF v_class_group_id IS NOT NULL THEN
        INSERT INTO public.chat_participants (chat_id, user_id)
        VALUES (v_class_group_id, NEW.id)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_join_class_group ON public.profiles;
CREATE TRIGGER tr_join_class_group 
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.join_class_group_on_profile_create();

-- 4. REALTIME CONFIGURATION (THE MOST IMPORTANT PART)
-- Enable Realtime for all tables
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

-- Re-create the publication for Realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.chats,
    public.chat_participants,
    public.messages,
    public.message_reactions;

-- 5. RLS POLICIES (Simplified for guaranteed access)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_visibility" ON chats;
CREATE POLICY "chat_visibility" ON chats FOR SELECT 
    USING (EXISTS (SELECT 1 FROM chat_participants WHERE chat_id = id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "participant_visibility" ON chat_participants;
CREATE POLICY "participant_visibility" ON chat_participants FOR SELECT 
    USING (true); -- Allow seeing who is in a chat

DROP POLICY IF EXISTS "message_visibility" ON messages;
CREATE POLICY "message_visibility" ON messages FOR SELECT 
    USING (EXISTS (SELECT 1 FROM chat_participants WHERE chat_id = messages.chat_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "message_insertion" ON messages;
CREATE POLICY "message_insertion" ON messages FOR INSERT 
    WITH CHECK (auth.uid() = sender_id);

-- Notify pgrst
NOTIFY pgrst, 'reload schema';
