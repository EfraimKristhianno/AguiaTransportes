import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface CreateUserRequest {
  username: string
  email?: string
  password: string
  name: string
  phone?: string
  role: 'admin' | 'gestor' | 'motorista' | 'cliente'
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's token to verify admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseAnonKey) {
      console.error('Missing SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY')
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role client for all operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Validate user using the token - use service role to get user from token
    const token = authHeader.replace('Bearer ', '')
    
    // Use admin client to get user from JWT token
    const { data: { user: currentUser }, error: userError } = await adminClient.auth.getUser(token)

    if (userError || !currentUser) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify if current user is admin using service role
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single()

    if (roleError || !roleData || !['admin', 'gestor'].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores e gestores podem criar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { username, email: providedEmail, password, name, phone, role }: CreateUserRequest = await req.json()

    if (!username || !password || !name || !role) {
      return new Response(
        JSON.stringify({ error: 'Usuário, senha, nome e perfil são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate internal email from username
    const sanitizedUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
    const email = providedEmail || `${sanitizedUsername}@aguia.internal`

    // Check if username already exists in users table
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'Este nome de usuário já está cadastrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create auth user
    const { data: authData, error: createAuthError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        phone
      }
    })

    if (createAuthError) {
      console.error('Error creating auth user:', createAuthError)
      
      if (createAuthError.message.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'Este email já está cadastrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ error: createAuthError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Falha ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user profile in users table
    const { error: profileError } = await adminClient
      .from('users')
      .insert({
        auth_id: authData.user.id,
        name,
        email,
        phone: phone || null,
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Rollback: delete auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar perfil do usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user role
    const { error: roleInsertError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role,
      })

    if (roleInsertError) {
      console.error('Error creating user role:', roleInsertError)
      // Rollback
      await adminClient.from('users').delete().eq('auth_id', authData.user.id)
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Erro ao atribuir perfil ao usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If role is motorista, create driver record
    if (role === 'motorista') {
      const { error: driverError } = await adminClient
        .from('drivers')
        .insert({
          user_id: authData.user.id,
          name,
          email,
          phone: phone || null,
          status: 'available',
          is_fixed: true,
        })

      if (driverError) {
        console.error('Error creating driver record:', driverError)
        // Don't rollback, just log - driver record is optional for initial creation
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name,
          role
        }
      }),
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