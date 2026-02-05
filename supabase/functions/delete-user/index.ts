 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 }
 
 interface DeleteUserRequest {
   authId: string
 }
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders })
   }
 
   try {
     const authHeader = req.headers.get('Authorization')
     if (!authHeader) {
       return new Response(
         JSON.stringify({ error: 'Token de autorização não fornecido' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!
     const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
 
     if (!supabaseAnonKey) {
       return new Response(
         JSON.stringify({ error: 'Configuração do servidor incompleta' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     const userClient = createClient(supabaseUrl, supabaseAnonKey, {
       global: { headers: { Authorization: authHeader } }
     })
 
     const { data: { user: currentUser }, error: authError } = await userClient.auth.getUser()
     if (authError || !currentUser) {
       return new Response(
         JSON.stringify({ error: 'Usuário não autenticado' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Verify if current user is admin
     const { data: roleData, error: roleError } = await userClient
       .from('user_roles')
       .select('role')
       .eq('user_id', currentUser.id)
       .single()
 
     if (roleError || roleData?.role !== 'admin') {
       return new Response(
         JSON.stringify({ error: 'Apenas administradores podem excluir usuários' }),
         { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     const { authId }: DeleteUserRequest = await req.json()
 
     if (!authId) {
       return new Response(
         JSON.stringify({ error: 'ID do usuário é obrigatório' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Prevent self-deletion
     if (authId === currentUser.id) {
       return new Response(
         JSON.stringify({ error: 'Você não pode excluir sua própria conta' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
       auth: {
         autoRefreshToken: false,
         persistSession: false
       }
     })
 
     // Delete from users table first (cascade will handle user_roles)
     await adminClient.from('user_roles').delete().eq('user_id', authId)
     await adminClient.from('users').delete().eq('auth_id', authId)
 
     // Delete auth user
     const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(authId)
 
     if (deleteAuthError) {
       console.error('Error deleting auth user:', deleteAuthError)
       return new Response(
         JSON.stringify({ error: 'Erro ao excluir usuário' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
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