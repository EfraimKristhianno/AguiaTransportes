
-- Remove gestor and client delete policies
DROP POLICY IF EXISTS "Gestores can delete delivery_requests" ON delivery_requests;
DROP POLICY IF EXISTS "Clients can delete own delivery_requests" ON delivery_requests;

-- Create admin-only delete policy
CREATE POLICY "Only admins can delete delivery_requests"
ON delivery_requests
FOR DELETE
USING (is_admin());
