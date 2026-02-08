-- Add processed column to notifications to track action status
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;

-- Add index for performance on status checks
CREATE INDEX IF NOT EXISTS idx_notifications_processed ON notifications(processed) WHERE processed = false;
