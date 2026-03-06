import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { request_number, origin_address, destination_address, transport_type } = await req.json();

    const ONESIGNAL_APP_ID = "bde63d28-81f0-4d42-a195-99ed3b24a541";
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!ONESIGNAL_REST_API_KEY) {
      throw new Error("ONESIGNAL_REST_API_KEY not configured");
    }

    // Build filters: target users with role=motorista AND matching transport_type
    const filters: any[] = [
      { field: "tag", key: "role", relation: "=", value: "motorista" },
    ];

    if (transport_type) {
      filters.push({ operator: "AND" });
      filters.push({ field: "tag", key: `transport_${transport_type}`, relation: "=", value: "true" });
    }

    const requestNum = String(request_number || 0).padStart(6, '0');

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      filters,
      headings: { en: `Nova Solicitação #${requestNum}` },
      contents: {
        en: `Coleta: ${origin_address || 'N/A'} → ${destination_address || 'N/A'} (${transport_type || 'N/A'})`,
      },
      url: "https://grupoaguiatransportes.lovable.app/motoristas",
    };

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
