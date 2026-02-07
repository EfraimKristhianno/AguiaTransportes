
-- Add storage INSERT policy that requires requestId prefix
CREATE POLICY "Users can upload to their request folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'request-attachments'
  AND (
    is_admin_or_gestor()
    OR EXISTS (
      SELECT 1 FROM delivery_requests dr
      JOIN drivers d ON d.id = dr.driver_id
      WHERE d.user_id = auth.uid()
      AND objects.name LIKE dr.id::text || '/%'
    )
    OR EXISTS (
      SELECT 1 FROM delivery_requests dr
      JOIN clients c ON c.id = dr.client_id
      JOIN users u ON u.email = c.email
      WHERE u.auth_id = auth.uid()
      AND objects.name LIKE dr.id::text || '/%'
    )
  )
);

-- Drop the old overly-permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload request attachments" ON storage.objects;
