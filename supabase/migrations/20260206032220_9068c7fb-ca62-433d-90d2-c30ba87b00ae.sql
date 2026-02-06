
-- Policy para motoristas verem solicitações disponíveis compatíveis com seus tipos de transporte
CREATE POLICY "Drivers can view available requests matching their transport types"
ON public.delivery_requests
FOR SELECT
USING (
  -- Permite ver solicitações com status 'solicitada' ou 'enviada'
  -- que correspondam aos tipos de transporte vinculados ao motorista
  (status IN ('solicitada', 'enviada'))
  AND
  (transport_type IN (
    SELECT dvt.vehicle_type
    FROM driver_vehicle_types dvt
    JOIN drivers d ON d.id = dvt.driver_id
    WHERE d.user_id = auth.uid()
  ))
);
