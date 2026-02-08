-- Add banner_url to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Update RLS policies to ensure it's handled properly (if not already covered by broad policies)
-- Usually profiles are public read, owner update.
-- If there are specific column-level policies, they should be updated here.

COMMENT ON COLUMN profiles.banner_url IS 'URL to the user''s profile banner image';
