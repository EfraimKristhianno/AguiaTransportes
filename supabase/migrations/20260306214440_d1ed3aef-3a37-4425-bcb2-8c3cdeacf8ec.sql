
-- Allow gestores to delete vehicle_logs
DROP POLICY IF EXISTS "Admins can delete vehicle_logs" ON vehicle_logs;
CREATE POLICY "Admins and gestores can delete vehicle_logs"
ON vehicle_logs FOR DELETE TO authenticated
USING (is_admin_or_gestor());

-- Allow gestores to delete oil_change_records
DROP POLICY IF EXISTS "Admins can delete oil_change_records" ON oil_change_records;
CREATE POLICY "Admins and gestores can delete oil_change_records"
ON oil_change_records FOR DELETE TO authenticated
USING (is_admin_or_gestor());

-- Allow gestores to delete maintenance_records
DROP POLICY IF EXISTS "Admins can delete maintenance_records" ON maintenance_records;
CREATE POLICY "Admins and gestores can delete maintenance_records"
ON maintenance_records FOR DELETE TO authenticated
USING (is_admin_or_gestor());
