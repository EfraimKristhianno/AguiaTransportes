-- Substitui toda ocorrência da placa AJI8I19 por AJI8I17
UPDATE public.vehicles
SET plate = 'AJI8I17', updated_at = now()
WHERE plate = 'AJI8I19';

UPDATE public.vehicle_logs
SET vehicle_plate = 'AJI8I17', updated_at = now()
WHERE vehicle_plate = 'AJI8I19';

UPDATE public.oil_change_records
SET vehicle_plate = 'AJI8I17'
WHERE vehicle_plate = 'AJI8I19';

UPDATE public.maintenance_records
SET vehicle_plate = 'AJI8I17', updated_at = now()
WHERE vehicle_plate = 'AJI8I19';
