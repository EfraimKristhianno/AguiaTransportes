-- Create a junction table for drivers and vehicle types
CREATE TABLE public.driver_vehicle_types (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    vehicle_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(driver_id, vehicle_type)
);

-- Enable RLS
ALTER TABLE public.driver_vehicle_types ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view driver_vehicle_types"
ON public.driver_vehicle_types
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and gestores can insert driver_vehicle_types"
ON public.driver_vehicle_types
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_gestor());

CREATE POLICY "Admins and gestores can update driver_vehicle_types"
ON public.driver_vehicle_types
FOR UPDATE
TO authenticated
USING (is_admin_or_gestor())
WITH CHECK (is_admin_or_gestor());

CREATE POLICY "Admins and gestores can delete driver_vehicle_types"
ON public.driver_vehicle_types
FOR DELETE
TO authenticated
USING (is_admin_or_gestor());