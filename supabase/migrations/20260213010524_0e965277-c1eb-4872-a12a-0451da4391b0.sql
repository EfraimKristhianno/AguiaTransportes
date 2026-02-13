
-- Drop the restrictive USING(false) policy that blocks ALL users including admins
DROP POLICY IF EXISTS "Deny unauthenticated access to clients" ON public.clients;

-- Recreate as a permissive policy so authenticated users with other matching policies can still access
-- Actually, we just need to add a permissive SELECT policy for authenticated users
-- The existing restrictive policies already handle access control

-- Add a permissive base policy that allows all authenticated users to read clients
CREATE POLICY "Authenticated users can view clients"
ON public.clients
FOR SELECT
TO authenticated
USING (true);
