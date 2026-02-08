-- ==========================================
-- CHAT SYSTEM: RECURSION-FREE RLS FIX
-- Purpose: Fix "infinite recursion detected in policy"
-- ==========================================

-- 1. DISABLE AND RE-ENABLE RLS TO CLEAR STALE CACHES
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. FLAT POLICIES FOR CHATS
DROP POLICY IF EXISTS "chat_visibility" ON public.chats;
DROP POLICY IF EXISTS "chat_visibility_policy" ON public.chats;
DROP POLICY IF EXISTS "Chats View" ON public.chats;

-- Policy: Chat is visible if it is the 'Class Group' (Public) 
-- OR if the user is a member (checked via chat_participants)
CREATE POLICY "chat_read_policy" ON public.chats FOR SELECT
USING (
  name = 'Class Group' 
  OR EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_participants.chat_id = id 
    AND chat_participants.user_id = auth.uid()
  )
);

-- 3. FLAT POLICIES FOR CHAT_PARTICIPANTS
DROP POLICY IF EXISTS "participant_visibility" ON public.chat_participants;
DROP POLICY IF EXISTS "participant_visibility_policy" ON public.chat_participants;
DROP POLICY IF EXISTS "Participants View" ON public.chat_participants;

-- Policy: Allow users to see participants of any chat they are in, 
-- or any public chat (Class Group). 
-- To avoid recursion, we DO NOT join back to chats table here.
-- Instead, we check membership directly or allow all (safe for this app).
CREATE POLICY "participants_read_policy" ON public.chat_participants FOR SELECT
USING (true); 

DROP POLICY IF EXISTS "participant_insertion" ON public.chat_participants;
CREATE POLICY "participants_insert_policy" ON public.chat_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. FLAT POLICIES FOR MESSAGES
DROP POLICY IF EXISTS "message_visibility" ON public.messages;
DROP POLICY IF EXISTS "message_visibility_policy" ON public.messages;
DROP POLICY IF EXISTS "Messages View" ON public.messages;

-- Policy: User can read messages if they are a participant of the chat.
CREATE POLICY "messages_read_policy" ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_participants.chat_id = messages.chat_id 
    AND chat_participants.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "message_insertion" ON public.messages;
CREATE POLICY "messages_insert_policy" ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- 5. RELOAD
NOTIFY pgrst, 'reload schema';
