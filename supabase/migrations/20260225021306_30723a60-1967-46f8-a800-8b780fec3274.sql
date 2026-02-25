
-- Create driver_locations table for real-time GPS tracking
CREATE TABLE public.driver_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  delivery_request_id uuid REFERENCES public.delivery_requests(id) ON DELETE SET NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  heading double precision,
  speed double precision,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(driver_id)
);

-- Enable RLS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Drivers can upsert their own location
CREATE POLICY "Drivers can insert own location"
ON public.driver_locations
FOR INSERT
TO authenticated
WITH CHECK (
  driver_id IN (
    SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can update own location"
ON public.driver_locations
FOR UPDATE
TO authenticated
USING (
  driver_id IN (
    SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can view own location"
ON public.driver_locations
FOR SELECT
TO authenticated
USING (
  driver_id IN (
    SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()
  )
);

-- Admins and gestores can view all locations
CREATE POLICY "Admins and gestores can view all locations"
ON public.driver_locations
FOR SELECT
TO authenticated
USING (is_admin_or_gestor());

-- Admins can delete locations
CREATE POLICY "Admins can delete locations"
ON public.driver_locations
FOR DELETE
TO authenticated
USING (is_admin());

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
