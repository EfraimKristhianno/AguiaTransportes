
-- Create storage bucket for vehicle attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-attachments', 'vehicle-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for vehicle-attachments bucket
CREATE POLICY "Drivers can upload own vehicle attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vehicle-attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can view vehicle attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vehicle-attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Admins can delete vehicle attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'vehicle-attachments'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'gestor')
  )
);
