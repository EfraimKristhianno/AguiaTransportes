-- Permitir que gestores visualizem todos os usuários (igual admin)
ALTER POLICY "Admins can view all users"
ON public.users
USING (public.is_admin_or_gestor());

-- Permitir que gestores visualizem todas as roles (necessário para listar perfis corretamente na tela de Usuários)
ALTER POLICY "Admins can view all roles"
ON public.user_roles
USING (public.is_admin_or_gestor());