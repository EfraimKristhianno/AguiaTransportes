-- Placa real do veículo tipo Caminhão (Truck) (substitui placeholder TIPO-*)
UPDATE public.vehicles
SET plate = 'AJI8I17', updated_at = now()
WHERE type = 'Caminhão (Truck)'
  AND plate LIKE 'TIPO%';

-- Cópias de placa nos registros operacionais
UPDATE public.vehicle_logs vl
SET vehicle_plate = 'AJI8I17'
FROM public.vehicles v
WHERE v.id = vl.vehicle_id
  AND v.type = 'Caminhão (Truck)'
  AND v.plate = 'AJI8I17'
  AND (vl.vehicle_plate IS NULL OR vl.vehicle_plate LIKE 'TIPO%');

UPDATE public.oil_change_records oc
SET vehicle_plate = 'AJI8I17'
FROM public.vehicles v
WHERE v.id = oc.vehicle_id
  AND v.type = 'Caminhão (Truck)'
  AND v.plate = 'AJI8I17'
  AND (oc.vehicle_plate IS NULL OR oc.vehicle_plate LIKE 'TIPO%');

UPDATE public.maintenance_records mr
SET vehicle_plate = 'AJI8I17', updated_at = now()
FROM public.vehicles v
WHERE v.id = mr.vehicle_id
  AND v.type = 'Caminhão (Truck)'
  AND v.plate = 'AJI8I17'
  AND mr.vehicle_plate LIKE 'TIPO%';
