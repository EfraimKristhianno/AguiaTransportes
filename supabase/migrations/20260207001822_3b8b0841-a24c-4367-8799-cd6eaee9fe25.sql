
-- Add attachments column to status history
ALTER TABLE public.delivery_request_status_history
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;

-- Allow drivers to update history entries for their assigned requests (to add attachments)
CREATE POLICY "Drivers can update own history attachments"
ON public.delivery_request_status_history
FOR UPDATE
USING (
  delivery_request_id IN (
    SELECT dr.id FROM delivery_requests dr
    JOIN drivers d ON dr.driver_id = d.id
    WHERE d.user_id = auth.uid()
  )
);
