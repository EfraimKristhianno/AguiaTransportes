import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Convert VAPID key from base64url to Uint8Array for Web Push
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const raw = atob(padded);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const requestNumber = String(body.request_number || 0).padStart(6, '0');
    const origin = body.origin_address || 'N/A';
    const destination = body.destination_address || 'N/A';
    const transportType = body.transport_type || '';

    console.log(`[notify-driver] New request #${requestNumber}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT');

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      console.error('[notify-driver] VAPID keys not configured');
      return new Response(JSON.stringify({ success: false, error: 'VAPID not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all push subscriptions from drivers (users with role 'motorista')
    const { data: driverRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'motorista');

    if (!driverRoles?.length) {
      console.log('[notify-driver] No drivers found');
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const driverUserIds = driverRoles.map(r => r.user_id);

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', driverUserIds);

    if (!subscriptions?.length) {
      console.log('[notify-driver] No push subscriptions found for drivers');
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[notify-driver] Sending to ${subscriptions.length} subscription(s)`);

    const payload = JSON.stringify({
      title: `Nova Solicitação #${requestNumber}`,
      body: `Coleta: ${origin} → ${destination}${transportType ? ` (${transportType})` : ''}`,
      tag: `request-${requestNumber}`,
      url: '/motoristas',
    });

    // Use web-push via npm package from esm.sh
    const webpush = await import("https://esm.sh/web-push@3.6.7");

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    let sent = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
        console.log(`[notify-driver] Sent to ${sub.endpoint.slice(0, 50)}...`);
      } catch (err: any) {
        console.error(`[notify-driver] Failed for ${sub.endpoint.slice(0, 50)}:`, err.message);
        errors.push(err.message);
        
        // Remove expired/invalid subscriptions (410 Gone, 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          console.log(`[notify-driver] Removed expired subscription ${sub.id}`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent, total: subscriptions.length, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("[notify-driver] Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
