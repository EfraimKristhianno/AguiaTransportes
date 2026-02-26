
-- Allow gestores to manage user_roles
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins and gestores can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (is_admin_or_gestor());

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins and gestores can update roles"
  ON public.user_roles FOR UPDATE
  USING (is_admin_or_gestor())
  WITH CHECK (is_admin_or_gestor());

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins and gestores can delete roles"
  ON public.user_roles FOR DELETE
  USING (is_admin_or_gestor());

-- Allow gestores to manage users table
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins and gestores can manage all users"
  ON public.users FOR ALL
  USING (is_admin_or_gestor())
  WITH CHECK (is_admin_or_gestor());
