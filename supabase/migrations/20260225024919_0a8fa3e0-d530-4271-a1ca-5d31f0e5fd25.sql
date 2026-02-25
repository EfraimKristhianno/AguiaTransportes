
-- Allow clients to view driver location for their own delivery requests
CREATE POLICY "Clients can view driver location for own requests"
ON public.driver_locations
FOR SELECT
USING (
  driver_id IN (
    SELECT dr.driver_id
    FROM delivery_requests dr
    JOIN clients c ON dr.client_id = c.id
    JOIN users u ON lower(u.email) = lower(c.email)
    WHERE u.auth_id = auth.uid()
      AND dr.driver_id IS NOT NULL
      AND dr.status IN ('aceita', 'coletada', 'em_rota')
  )
);
