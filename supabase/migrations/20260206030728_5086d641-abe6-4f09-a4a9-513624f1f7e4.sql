-- Fix function search_path (linter WARN 1)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =====================================================================
-- Fix clients policies
-- =====================================================================

-- Remove policies that referenced auth.users (can cause permission denied)
DROP POLICY IF EXISTS "Clients can insert own client record" ON public.clients;
DROP POLICY IF EXISTS "Clients can update own client record" ON public.clients;

-- Replace email-match policy to be case-insensitive
DROP POLICY IF EXISTS "Clients can view own client record" ON public.clients;
CREATE POLICY "Clients can view own client record"
ON public.clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON u.auth_id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'cliente'::public.app_role
      AND lower(u.email) = lower(public.clients.email)
  )
);

-- Allow any authenticated user to create/update THEIR client record
-- (email must match JWT email, case-insensitive)
CREATE POLICY "Clients can insert own client record"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  lower(public.clients.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

CREATE POLICY "Clients can update own client record"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  lower(public.clients.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
WITH CHECK (
  lower(public.clients.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- =====================================================================
-- Fix delivery_requests policies (email match must be case-insensitive)
-- =====================================================================

DROP POLICY IF EXISTS "Clients can insert own delivery_requests" ON public.delivery_requests;
CREATE POLICY "Clients can insert own delivery_requests"
ON public.delivery_requests
FOR INSERT
TO authenticated
WITH CHECK (
  (
    client_id IN (
      SELECT c.id
      FROM public.clients c
      JOIN public.users u ON lower(u.email) = lower(c.email)
      WHERE u.auth_id = auth.uid()
    )
  )
  OR public.is_admin_or_gestor()
);

DROP POLICY IF EXISTS "Clients can view own delivery_requests" ON public.delivery_requests;
CREATE POLICY "Clients can view own delivery_requests"
ON public.delivery_requests
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT c.id
    FROM public.clients c
    JOIN public.users u ON lower(u.email) = lower(c.email)
    WHERE u.auth_id = auth.uid()
  )
);
