
-- Remove the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

-- Create restricted policy for admins and gestores only
CREATE POLICY "Admins and gestores can view all clients"
  ON public.clients
  FOR SELECT
  USING (is_admin_or_gestor());
