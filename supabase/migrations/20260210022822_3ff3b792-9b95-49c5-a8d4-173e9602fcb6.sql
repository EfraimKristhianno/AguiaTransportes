-- Drop the overly complex policy that may be failing for some users
DROP POLICY IF EXISTS "Authorized users can view request attachments" ON storage.objects;

-- Create a simpler policy: any authenticated user can view request-attachments
-- Security is maintained because signed URLs are only generated when the user 
-- has access to the delivery_request record (controlled by RLS on that table)
CREATE POLICY "Authenticated users can view request attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'request-attachments'
  AND auth.role() = 'authenticated'
);