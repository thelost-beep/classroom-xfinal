// Supabase Edge Function to send Web Push notifications
// Deploy this to Supabase with: supabase functions deploy push-notifications

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import webpush from "https://esm.sh/web-push@3.6.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails(
    "mailto:example@yourdomain.com",
    vapidPublicKey,
    vapidPrivateKey
);

serve(async (req) => {
    const { record } = await req.json(); // Triggered by DB Webhook

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", record.user_id);

    if (error || !subscriptions) {
        return new Response(JSON.stringify({ error: error?.message || "No subscriptions found" }));
    }

    // 2. Prepare notification payload
    const payload = JSON.stringify({
        title: "ClassroomX",
        body: record.content,
        icon: "/pwa-192x192.png"
    });

    // 3. Send notifications
    const results = await Promise.all(
        subscriptions.map(sub =>
            webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                },
                payload
            ).catch(e => console.error("Push failed for endpoint:", sub.endpoint, e))
        )
    );

    return new Response(JSON.stringify({ success: true, results }));
});
