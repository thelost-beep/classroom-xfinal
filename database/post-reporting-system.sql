-- ======================================================================================
-- POST REPORTING SYSTEM
-- ======================================================================================

-- 1. Create the reports table
CREATE TABLE IF NOT EXISTS post_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Users can create reports
CREATE POLICY "Users can create reports" ON post_reports
FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND reporter_id = auth.uid());

-- Only admins can see and manage reports
CREATE POLICY "Admins can view reports" ON post_reports
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

CREATE POLICY "Admins can update reports" ON post_reports
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- 4. Notification trigger for admins when a report is created
CREATE OR REPLACE FUNCTION notify_admins_of_report()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, content, actor_id, reference_id, is_read)
    SELECT id, 'system', 'A new post has been reported for review.', NEW.reporter_id, NEW.post_id, false
    FROM profiles
    WHERE role = 'admin';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_report_created ON post_reports;
CREATE TRIGGER on_report_created
AFTER INSERT ON post_reports
FOR EACH ROW
EXECUTE FUNCTION notify_admins_of_report();
