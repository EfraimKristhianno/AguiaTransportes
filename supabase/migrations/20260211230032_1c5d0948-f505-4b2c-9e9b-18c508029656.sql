
CREATE POLICY "Clients can update own delivery_requests"
ON public.delivery_requests
FOR UPDATE
USING (
  client_id IN (
    SELECT c.id FROM clients c
    JOIN users u ON lower(u.email) = lower(c.email)
    WHERE u.auth_id = auth.uid()
  )
)
WITH CHECK (
  client_id IN (
    SELECT c.id FROM clients c
    JOIN users u ON lower(u.email) = lower(c.email)
    WHERE u.auth_id = auth.uid()
  )
);
