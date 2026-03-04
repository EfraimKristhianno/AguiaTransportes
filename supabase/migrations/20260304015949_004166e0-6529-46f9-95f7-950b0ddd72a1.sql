-- Allow drivers to delete their own vehicle_logs
CREATE POLICY "Drivers can delete own vehicle_logs"
ON public.vehicle_logs
FOR DELETE
TO authenticated
USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

-- Allow drivers to delete their own oil_change_records
CREATE POLICY "Drivers can delete own oil_change_records"
ON public.oil_change_records
FOR DELETE
TO authenticated
USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

-- Allow drivers to update their own oil_change_records
CREATE POLICY "Drivers can update own oil_change_records"
ON public.oil_change_records
FOR UPDATE
TO authenticated
USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

-- Allow drivers to delete their own maintenance_records
CREATE POLICY "Drivers can delete own maintenance_records"
ON public.maintenance_records
FOR DELETE
TO authenticated
USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));

-- Allow drivers to update their own maintenance_records
CREATE POLICY "Drivers can update own maintenance_records"
ON public.maintenance_records
FOR UPDATE
TO authenticated
USING (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()));