import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, password } = await req.json();

    if (!name || typeof name !== "string" || !password || typeof password !== "string") {
      return new Response(
        JSON.stringify({ error: "Nome e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up user email by name (case-insensitive)
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("email, name")
      .ilike("name", name.trim())
      .single();

    console.log("User lookup result:", { found: !!userData, name: name.trim(), error: userError?.message });

    if (userError || !userData?.email) {
      console.log("User not found for name:", name.trim());
      return new Response(
        JSON.stringify({ error: "invalid_credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sign in with the found email
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: userData.email,
      password,
    });

    if (authError) {
      console.log("Auth error for email:", userData.email, "error:", authError.message);
      return new Response(
        JSON.stringify({ error: "invalid_credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ session: authData.session }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
