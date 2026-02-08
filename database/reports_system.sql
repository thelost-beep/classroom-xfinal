-- Create a table for bug reports and suggestions
CREATE TABLE IF NOT EXISTS app_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('bug', 'suggestion')) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own reports
DROP POLICY IF EXISTS "Users view own reports" ON app_reports;
CREATE POLICY "Users view own reports" ON app_reports
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can create reports
DROP POLICY IF EXISTS "Users create reports" ON app_reports;
CREATE POLICY "Users create reports" ON app_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can see everything
DROP POLICY IF EXISTS "Admins view all reports" ON app_reports;
CREATE POLICY "Admins view all reports" ON app_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Admins can update everything
DROP POLICY IF EXISTS "Admins manage all reports" ON app_reports;
CREATE POLICY "Admins manage all reports" ON app_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_app_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_app_reports_updated_at ON app_reports;
CREATE TRIGGER trigger_update_app_reports_updated_at
    BEFORE UPDATE ON app_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_app_reports_updated_at();
