import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Find all 'agendada' requests where scheduled_date <= now
  const { data: requests, error } = await supabase
    .from("delivery_requests")
    .select("id, request_number, scheduled_date")
    .eq("status", "agendada")
    .not("scheduled_date", "is", null)
    .lte("scheduled_date", new Date().toISOString());

  if (error) {
    console.error("Error fetching scheduled requests:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!requests || requests.length === 0) {
    return new Response(JSON.stringify({ message: "No scheduled requests to process", count: 0 }));
  }

  const results = [];
  for (const req of requests) {
    const { error: updateError } = await supabase
      .from("delivery_requests")
      .update({ status: "solicitada" })
      .eq("id", req.id);

    if (updateError) {
      console.error(`Failed to update request ${req.request_number}:`, updateError);
      results.push({ id: req.id, success: false, error: updateError.message });
    } else {
      console.log(`Request ${req.request_number} changed from agendada to solicitada`);
      results.push({ id: req.id, success: true });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }));
});
