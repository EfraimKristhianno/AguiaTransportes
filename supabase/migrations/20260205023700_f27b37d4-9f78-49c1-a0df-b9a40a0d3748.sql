-- Drop the overly permissive storage policy
DROP POLICY IF EXISTS "Users can view their own request attachments" ON storage.objects;

-- Create a properly scoped policy for viewing attachments
-- Admins/gestores can view all, clients can view their requests, drivers can view assigned requests
CREATE POLICY "Authorized users can view request attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'request-attachments' AND (
    -- Admins and gestores can view all attachments
    is_admin_or_gestor() OR
    -- Clients can view attachments from their own delivery requests
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      JOIN clients c ON c.id = dr.client_id
      JOIN users u ON u.email = c.email
      WHERE u.auth_id = auth.uid()
      AND storage.objects.name LIKE dr.id::text || '/%'
    ) OR
    -- Drivers can view attachments from their assigned delivery requests
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      JOIN drivers d ON d.id = dr.driver_id
      WHERE d.user_id = auth.uid()
      AND storage.objects.name LIKE dr.id::text || '/%'
    )
  )
);