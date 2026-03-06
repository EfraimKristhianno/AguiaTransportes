import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { request_number, origin_address, destination_address, transport_type } = await req.json();

    const ONESIGNAL_APP_ID = "bde63d28-81f0-4d42-a195-99ed3b24a541";
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!ONESIGNAL_REST_API_KEY) {
      throw new Error("ONESIGNAL_REST_API_KEY not configured");
    }

    const requestNum = String(request_number || 0).padStart(6, '0');

    // Send to ALL users tagged as motorista
    const filters: any[] = [
      { field: "tag", key: "role", relation: "=", value: "motorista" },
    ];

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      filters,
      headings: { en: `Nova Solicitação #${requestNum}` },
      contents: {
        en: `Coleta: ${origin_address || 'N/A'} → ${destination_address || 'N/A'} (${transport_type || 'N/A'})`,
      },
      url: "https://grupoaguiatransportes.lovable.app/motoristas",
      // Enable background delivery on mobile
      content_available: true,
      priority: 10,
      android_channel_id: undefined,
    };

    console.log("Sending OneSignal notification:", JSON.stringify(payload));

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("OneSignal response:", JSON.stringify(result));

    if (!response.ok) {
      console.error("OneSignal error status:", response.status);
      return new Response(JSON.stringify({ success: false, error: result }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
