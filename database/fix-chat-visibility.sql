-- RELAXED RLS FOR CLASS GROUP
-- This ensures anyone can see and join the group chat

DROP POLICY IF EXISTS "chat_visibility" ON chats;
CREATE POLICY "chat_visibility" ON chats FOR SELECT 
    USING (
        EXISTS (SELECT 1 FROM chat_participants WHERE chat_id = id AND user_id = auth.uid())
        OR name = 'Class Group'
    );

-- Also ensure participants can always join
DROP POLICY IF EXISTS "participant_insertion" ON chat_participants;
CREATE POLICY "participant_insertion" ON chat_participants FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
