-- EMERGENCY: ENABLE REALTIME FOR CHAT TABLES
-- This must be run if messages aren't showing up in real-time

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.typing_indicators REPLICA IDENTITY FULL;

-- Re-enable Realtime publication
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.messages, 
    public.message_reactions, 
    public.chat_participants,
    public.typing_indicators;

-- Ensure RLS doesn't block inserts if they're coming through standard channels
-- Relaxing insert policy temporarily to verify connectivity
DROP POLICY IF EXISTS "Messages Insert" ON messages;
CREATE POLICY "Messages Insert" ON messages FOR INSERT WITH CHECK (true); -- BE CAREFUL: This allows anyone to insert. Re-harden after verification.

NOTIFY pgrst, 'reload schema';
