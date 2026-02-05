-- Add new columns to delivery_requests
ALTER TABLE public.delivery_requests
ADD COLUMN IF NOT EXISTS requester TEXT,
ADD COLUMN IF NOT EXISTS transport_type TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for request attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('request-attachments', 'request-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for request attachments
CREATE POLICY "Authenticated users can upload request attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'request-attachments');

CREATE POLICY "Users can view their own request attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'request-attachments');

CREATE POLICY "Admins and gestores can view all request attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'request-attachments' AND is_admin_or_gestor());

CREATE POLICY "Admins can delete request attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'request-attachments' AND is_admin());

-- Update RLS for clients to allow viewing by role=cliente for their own data
CREATE POLICY "Clients can view own client record"
ON public.clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON u.auth_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'cliente'
    AND u.email = clients.email
  )
);

-- Allow clients to insert their own delivery requests
CREATE POLICY "Clients can insert own delivery_requests"
ON public.delivery_requests
FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.users u ON u.email = c.email
    WHERE u.auth_id = auth.uid()
  )
  OR is_admin_or_gestor()
);

-- Clients can view their own delivery requests
CREATE POLICY "Clients can view own delivery_requests"
ON public.delivery_requests
FOR SELECT
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.users u ON u.email = c.email
    WHERE u.auth_id = auth.uid()
  )
);