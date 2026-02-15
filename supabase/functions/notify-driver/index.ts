import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const ONESIGNAL_APP_ID = "d34d96dd-731e-49c6-bee8-5c79b4291d81";
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!ONESIGNAL_REST_API_KEY) {
      throw new Error("ONESIGNAL_REST_API_KEY not configured");
    }

    const payload = await req.json();
    const { record, type: eventType } = payload;

    if (!record) {
      return new Response(JSON.stringify({ error: "No record" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = record.status || "";
    const transportType = record.transport_type || "";

    // Only notify on relevant statuses
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

    // Find drivers that have this vehicle type
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: matchingDrivers } = await supabase
      .from("driver_vehicle_types")
      .select("driver_id, drivers!inner(user_id, status)")
      .eq("vehicle_type", transportType);

    if (!matchingDrivers || matchingDrivers.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no matching drivers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user_ids of available drivers
    const targetUserIds = matchingDrivers
      .filter((d: any) => d.drivers?.status === "available" && d.drivers?.user_id)
      .map((d: any) => d.drivers.user_id);

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no available drivers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const title = "🚛 Nova solicitação disponível!";
    const message = `De: ${record.origin_address}\nPara: ${record.destination_address}`;

    // Send OneSignal notification targeting specific external user IDs
    const onesignalPayload: any = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: {
        external_id: targetUserIds,
      },
      target_channel: "push",
      headings: { en: title },
      contents: { en: message },
      data: {
        request_id: record.id,
        request_number: record.request_number,
        type: "new_request",
      },
      web_push_topic: `request-${record.id}`,
      priority: 10,
      ttl: 3600,
      isAnyWeb: true,
      chrome_web_sound: "https://aguiatransportes.lovable.app/notification-sound.mp3",
    };

    const onesignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(onesignalPayload),
    });

    const onesignalResult = await onesignalResponse.json();
    console.log("[notify-driver] OneSignal response:", JSON.stringify(onesignalResult));

    // If external_id targeting failed, fallback to tag-based targeting
    let fallbackResult = null;
    if (onesignalResult.errors?.invalid_aliases) {
      console.log("[notify-driver] External ID failed, trying tag-based fallback for transport_type:", transportType);
      
      const fallbackPayload = {
        app_id: ONESIGNAL_APP_ID,
        filters: [
          { field: "tag", key: "role", relation: "=", value: "motorista" },
          { operator: "AND" },
          { field: "tag", key: "vehicle_types", relation: "=", value: transportType },
        ],
        headings: { en: title },
        contents: { en: message },
        data: {
          request_id: record.id,
          request_number: record.request_number,
          type: "new_request",
        },
        web_push_topic: `request-fallback-${record.id}`,
        priority: 10,
        ttl: 3600,
        isAnyWeb: true,
        chrome_web_sound: "https://aguiatransportes.lovable.app/notification-sound.mp3",
      };

      const fallbackResponse = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify(fallbackPayload),
      });

      fallbackResult = await fallbackResponse.json();
      console.log("[notify-driver] Fallback (tag) response:", JSON.stringify(fallbackResult));
    }

    return new Response(
      JSON.stringify({
        success: true,
        drivers_notified: targetUserIds.length,
        onesignal: onesignalResult,
        fallback: fallbackResult,
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
