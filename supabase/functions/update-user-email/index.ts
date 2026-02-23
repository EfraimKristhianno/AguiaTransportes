import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Validate caller is admin or gestor
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: currentUser }, error: userError } = await adminClient.auth.getUser(token)

    if (userError || !currentUser) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single()

    if (!roleData || !['admin', 'gestor'].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores e gestores podem atualizar emails' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { authId, newEmail } = await req.json()

    if (!authId || !newEmail) {
      return new Response(
        JSON.stringify({ error: 'authId e newEmail são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get old email before updating
    const { data: oldUser } = await adminClient
      .from('users')
      .select('email')
      .eq('auth_id', authId)
      .single()

    const oldEmail = oldUser?.email

    // Update email in Supabase Auth
    const { error: authError } = await adminClient.auth.admin.updateUserById(authId, {
      email: newEmail,
      email_confirm: true,
    })

    if (authError) {
      console.error('Error updating auth email:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update email in users table
    await adminClient
      .from('users')
      .update({ email: newEmail })
      .eq('auth_id', authId)

    // Update email in drivers table
    await adminClient
      .from('drivers')
      .update({ email: newEmail })
      .eq('user_id', authId)

    // Update email in clients table (match by old email)
    if (oldEmail) {
      await adminClient
        .from('clients')
        .update({ email: newEmail })
        .ilike('email', oldEmail)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
