-- ======================================================================================
-- IMPROVED ADMIN TRANSACTION SYSTEM
-- robust handling of reports, deletions, and auditing
-- ======================================================================================

-- 1. Create Audit Logs Table (if not exists)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES profiles(id),
    action_type TEXT NOT NULL, -- 'delete_post', 'dismiss_report', 'ban_user', etc.
    target_type TEXT NOT NULL, -- 'post', 'user', 'comment'
    target_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON admin_audit_logs
FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 2. Create Transactional Resolution Function
CREATE OR REPLACE FUNCTION admin_resolve_report(
    report_id UUID,
    resolution_action TEXT -- 'delete_post', 'dismiss'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_report RECORD;
    v_post_id UUID;
    v_admin_id UUID;
BEGIN
    -- Check if user is admin
    v_admin_id := auth.uid();
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied: User is not an admin';
    END IF;

    -- Get report details
    SELECT * INTO v_report FROM post_reports WHERE id = report_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report not found';
    END IF;
    
    v_post_id := v_report.post_id;

    IF resolution_action = 'delete_post' THEN
        -- Log action BEFORE deletion (so we have record even if post is gone)
        INSERT INTO admin_audit_logs (admin_id, action_type, target_type, target_id, details)
        VALUES (v_admin_id, 'delete_post', 'post', v_post_id, jsonb_build_object('report_id', report_id, 'reason', v_report.reason));
        
        -- Delete the post (Cascades to report usually)
        DELETE FROM posts WHERE id = v_post_id;
        
        RETURN jsonb_build_object('success', true, 'action', 'deleted');
        
    ELSIF resolution_action = 'dismiss' THEN
        -- Update report status
        UPDATE post_reports SET status = 'dismissed' WHERE id = report_id;
        
        -- Log action
        INSERT INTO admin_audit_logs (admin_id, action_type, target_type, target_id, details)
        VALUES (v_admin_id, 'dismiss_report', 'post', v_post_id, jsonb_build_object('report_id', report_id));
        
        RETURN jsonb_build_object('success', true, 'action', 'dismissed');
    ELSE
        RAISE EXCEPTION 'Invalid action';
    END IF;
END;
$$;
