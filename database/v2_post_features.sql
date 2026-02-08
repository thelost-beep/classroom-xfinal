-- Enable Row Level Security for updates
-- Only the owner of a post should be able to edit it.

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update their own posts"
ON posts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Optional: Add a trigger to update a 'updated_at' column if it exists
-- CREATE TRIGGER handle_updated_at BEFORE UPDATE ON posts
-- FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
