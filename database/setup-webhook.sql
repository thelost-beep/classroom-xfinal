-- SQL to set up Database Webhook for Push Notifications
-- Run this in Supabase SQL Editor

-- 1. Ensure the Edge Function is deployed first!
-- The URL should be: https://[your-project-ref].supabase.co/functions/v1/push-notifications

-- 2. Create the Webhook
-- This will trigger the Edge Function whenever a new notification is inserted
-- Note: Replace 'https://YOUR_PROJECT_REF.supabase.co' with your actual Supabase project URL

-- First, let's create a trigger function that calls the webhook
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := (SELECT value FROM (SELECT COALESCE(
        (SELECT value FROM options.settings WHERE key = 'edge_function_url'),
        'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notifications'
      )) AS t(value)),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM options.settings WHERE key = 'service_role_key')
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- OR SIMPLY USE THE SUPABASE DASHBOARD:
-- 1. Go to "Database" -> "Webhooks"
-- 2. Click "Create a new webhook"
-- 3. Name: "push_notifications_trigger"
-- 4. Table: "notifications"
-- 5. Events: "Insert"
-- 6. Type: "HTTP Request" (or "Supabase Edge Function")
-- 7. If Edge Function: Select "push-notifications"
-- 8. If HTTP Request: Method "POST", URL "https://YOUR_PROJECT.supabase.co/functions/v1/push-notifications"
