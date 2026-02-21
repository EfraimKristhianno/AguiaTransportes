import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@aguiatransportes.com";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID keys not configured");
    }

    const body = await req.json();
    const { record, type: eventType } = body;

    if (!record) {
      return new Response(JSON.stringify({ error: "No record" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = record.status || "";
    const transportType = record.transport_type || "";

    if (!["solicitada", "enviada"].includes(status)) {
      return new Response(JSON.stringify({ skipped: true, reason: "status not relevant" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!transportType) {
      return new Response(JSON.stringify({ skipped: true, reason: "no transport_type" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find drivers with matching vehicle type
    const { data: matchingDrivers } = await supabase
      .from("driver_vehicle_types")
      .select("driver_id, drivers!inner(user_id, status)")
      .eq("vehicle_type", transportType);

    if (!matchingDrivers || matchingDrivers.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no matching drivers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUserIds = matchingDrivers
      .filter((d: any) => d.drivers?.status === "available" && d.drivers?.user_id)
      .map((d: any) => d.drivers.user_id);

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no available drivers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get push subscriptions for target drivers
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    if (subError) {
      console.error("[notify-driver] Error fetching subscriptions:", subError);
      throw new Error("Failed to fetch subscriptions");
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[notify-driver] No push subscriptions found for drivers:", targetUserIds);
      return new Response(JSON.stringify({ skipped: true, reason: "no subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[notify-driver] Found ${subscriptions.length} subscriptions for ${targetUserIds.length} drivers`);

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const title = "🚛 Nova solicitação disponível!";
    const message = `De: ${record.origin_address}\nPara: ${record.destination_address}`;

    const notificationPayload = JSON.stringify({
      title,
      body: message,
      tag: `request-${record.id}`,
      data: {
        request_id: record.id,
        request_number: record.request_number,
        type: "new_request",
      },
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSub, notificationPayload, {
          TTL: 3600,
          urgency: "high",
        });

        sent++;
        console.log(`[notify-driver] Push sent to ${sub.user_id}`);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
          console.log(`[notify-driver] Subscription expired for ${sub.user_id}: ${err.statusCode}`);
        } else {
          console.error(`[notify-driver] Error sending to ${sub.user_id}:`, err.statusCode || err.message || err);
        }
        failed++;
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
      console.log(`[notify-driver] Cleaned ${expiredEndpoints.length} expired subscriptions`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total_subscriptions: subscriptions.length,
        expired_cleaned: expiredEndpoints.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[notify-driver] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
