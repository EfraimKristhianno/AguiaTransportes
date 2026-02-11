
-- Allow gestores to delete delivery_requests
CREATE POLICY "Gestores can delete delivery_requests"
ON public.delivery_requests
FOR DELETE
USING (is_admin_or_gestor());

-- Allow clients to delete their own delivery_requests
CREATE POLICY "Clients can delete own delivery_requests"
ON public.delivery_requests
FOR DELETE
USING (
  client_id IN (
    SELECT c.id
    FROM clients c
    JOIN users u ON lower(u.email) = lower(c.email)
    WHERE u.auth_id = auth.uid()
  )
);

-- Drop the old admin-only delete policy since the new gestor policy covers admin too
DROP POLICY IF EXISTS "Admins can delete delivery_requests" ON public.delivery_requests;
