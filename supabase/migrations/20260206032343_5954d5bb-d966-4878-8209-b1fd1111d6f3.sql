
-- Policy para motoristas aceitarem solicitações disponíveis
-- Permite UPDATE apenas em solicitações com status 'solicitada' ou 'enviada'
CREATE POLICY "Drivers can accept available requests"
ON public.delivery_requests
FOR UPDATE
USING (
  -- Pode atualizar se a solicitação está disponível e corresponde ao tipo de transporte
  (status IN ('solicitada', 'enviada'))
  AND
  (transport_type IN (
    SELECT dvt.vehicle_type
    FROM driver_vehicle_types dvt
    JOIN drivers d ON d.id = dvt.driver_id
    WHERE d.user_id = auth.uid()
  ))
)
WITH CHECK (
  -- Garante que o motorista só pode se vincular a si mesmo
  driver_id IN (
    SELECT d.id
    FROM drivers d
    WHERE d.user_id = auth.uid()
  )
);
