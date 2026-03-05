import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS_LABELS: Record<string, string> = {
  solicitada: "Solicitada",
  aceita: "Aceita",
  pendente_coleta: "Pendente Coleta",
  coletada: "Coletada",
  em_rota: "Em Trânsito",
  pendente_entrega: "Pendente Entrega",
  entregue: "Entregue",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:efraimkristhianno@gmail.com";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID keys not configured");
    }

    const body = await req.json();
    const { record, old_record } = body;

    if (!record || typeof record !== "object") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newStatus = record.status;
    const oldStatus = old_record?.status;
    const requestId = record.id;
    const requestNumber = record.request_number;

    // Skip if status didn't change or is the initial "solicitada" (handled by notify-driver)
    if (!newStatus || newStatus === oldStatus || newStatus === "solicitada" || newStatus === "enviada") {
      return new Response(JSON.stringify({ skipped: true, reason: "not a relevant status change" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the full request with client info
    const { data: request, error: reqError } = await supabase
      .from("delivery_requests")
      .select("*, clients:client_id(name, email)")
      .eq("id", requestId)
      .single();

    if (reqError || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine who to notify:
    // - Client (gestor/admin) gets notified of driver status changes
    // - Driver gets notified if admin/gestor changes status
    const targetUserIds: string[] = [];

    // Notify the client's users (admin/gestor)
    const { data: adminGestorUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "gestor"]);

    if (adminGestorUsers) {
      targetUserIds.push(...adminGestorUsers.map((u: any) => u.user_id));
    }

    // Also notify the driver if assigned
    if (request.driver_id) {
      const { data: driver } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", request.driver_id)
        .single();

      if (driver?.user_id) {
        targetUserIds.push(driver.user_id);
      }
    }

    // Remove duplicates
    const uniqueUserIds = [...new Set(targetUserIds)];

    if (uniqueUserIds.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no users to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get push subscriptions
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", uniqueUserIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    const title = `📦 Solicitação #${requestNumber || ""}`;
    const message = `Status atualizado para: ${statusLabel}`;

    const notificationPayload = JSON.stringify({
      title,
      body: message,
      tag: `status-${requestId}-${Date.now()}`,
      data: {
        request_id: requestId,
        request_number: requestNumber,
        type: "status_change",
        new_status: newStatus,
      },
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        const isApple = sub.endpoint.includes("web.push.apple.com");

        const pushOptions: any = {
          TTL: 86400,
          urgency: "high",
        };

        if (isApple) {
          pushOptions.headers = {
            Topic: "web.app.lovable.03d2b86de99344f0825dfdf29f6db22b",
          };
        }

        await webpush.sendNotification(pushSub, notificationPayload, pushOptions);
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          console.error(`[notify-status-change] Error sending push:`, err.statusCode || err.message);
        }
        failed++;
      }
    }

    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: subscriptions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[notify-status-change] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
