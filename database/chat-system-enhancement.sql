-- =====================================================
-- CHAT SYSTEM ENHANCEMENT
-- Adds post sharing, reactions, typing indicators, read receipts
-- Author: Antigravity AI
-- Date: 2026-02-07
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. EXTEND MESSAGES TABLE
-- =====================================================

-- Add new columns to messages table
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'file', 'post', 'sticker')),
  ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- =====================================================
-- 2. MESSAGE REACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create index for faster reactions lookup
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);

-- =====================================================
-- 3. SHARED POSTS
-- =====================================================

CREATE TABLE IF NOT EXISTS shared_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL UNIQUE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster shared posts lookup
CREATE INDEX IF NOT EXISTS idx_shared_posts_message_id ON shared_posts(message_id);
CREATE INDEX IF NOT EXISTS idx_shared_posts_post_id ON shared_posts(post_id);

-- =====================================================
-- 4. TYPING INDICATORS
-- =====================================================

CREATE TABLE IF NOT EXISTS typing_indicators (
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

-- Create index for faster typing indicators cleanup
CREATE INDEX IF NOT EXISTS idx_typing_indicators_updated_at ON typing_indicators(updated_at);

-- =====================================================
-- 5. READ RECEIPTS
-- =====================================================

CREATE TABLE IF NOT EXISTS read_receipts (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Create index for faster read receipts lookup
CREATE INDEX IF NOT EXISTS idx_read_receipts_message_id ON read_receipts(message_id);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_receipts ENABLE ROW LEVEL SECURITY;

-- Message Reactions Policies
CREATE POLICY "Reactions View" ON message_reactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM messages m 
    JOIN chat_participants cp ON cp.chat_id = m.chat_id
    WHERE m.id = message_reactions.message_id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Reactions Manage" ON message_reactions FOR ALL USING (auth.uid() = user_id);

-- Shared Posts Policies
CREATE POLICY "Shared Posts View" ON shared_posts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM messages m 
    JOIN chat_participants cp ON cp.chat_id = m.chat_id
    WHERE m.id = shared_posts.message_id 
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Shared Posts Insert" ON shared_posts FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages m 
    JOIN chat_participants cp ON cp.chat_id = m.chat_id
    WHERE m.id = shared_posts.message_id 
    AND m.sender_id = auth.uid()
  )
);

-- Typing Indicators Policies
CREATE POLICY "Typing View" ON typing_indicators FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = typing_indicators.chat_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Typing Manage" ON typing_indicators FOR ALL USING (auth.uid() = user_id);

-- Read Receipts Policies
CREATE POLICY "Read Receipts View" ON read_receipts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM messages m 
    JOIN chat_participants cp ON cp.chat_id = m.chat_id
    WHERE m.id = read_receipts.message_id 
    AND (cp.user_id = auth.uid() OR m.sender_id = auth.uid())
  )
);

CREATE POLICY "Read Receipts Insert" ON read_receipts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update Messages DELETE policy to support soft deletes
DROP POLICY IF EXISTS "Messages Send" ON messages;
CREATE POLICY "Messages Insert" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Messages Update" ON messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Messages Delete" ON messages FOR DELETE USING (auth.uid() = sender_id);

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to clean up old typing indicators (> 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators 
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count for a chat
CREATE OR REPLACE FUNCTION get_unread_count(p_chat_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM messages m
  WHERE m.chat_id = p_chat_id
    AND m.sender_id != p_user_id
    AND m.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM read_receipts rr 
      WHERE rr.message_id = m.id 
      AND rr.user_id = p_user_id
    );
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON message_reactions TO authenticated;
GRANT SELECT, INSERT ON shared_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON typing_indicators TO authenticated;
GRANT SELECT, INSERT ON read_receipts TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
