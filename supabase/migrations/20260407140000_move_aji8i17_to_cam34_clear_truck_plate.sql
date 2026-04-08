-- AJI8I17 no Caminhão (3/4); Truck volta ao placeholder (sem placa operacional fixa)
UPDATE public.vehicles
SET plate = 'TIPO-CAM', updated_at = now()
WHERE type = 'Caminhão (Truck)'
  AND plate = 'AJI8I17';

UPDATE public.vehicles
SET plate = 'AJI8I17', updated_at = now()
WHERE type = 'Caminhão (3/4)'
  AND (plate LIKE 'TIPO%' OR plate = 'AJI8I19');

UPDATE public.vehicle_logs vl
SET vehicle_plate = v.plate
FROM public.vehicles v
WHERE v.id = vl.vehicle_id
  AND v.type IN ('Caminhão (Truck)', 'Caminhão (3/4)')
  AND (vl.vehicle_plate IS NULL OR vl.vehicle_plate IN ('AJI8I17', 'AJI8I19') OR vl.vehicle_plate LIKE 'TIPO%');

UPDATE public.oil_change_records oc
SET vehicle_plate = v.plate
FROM public.vehicles v
WHERE v.id = oc.vehicle_id
  AND v.type IN ('Caminhão (Truck)', 'Caminhão (3/4)')
  AND (oc.vehicle_plate IS NULL OR oc.vehicle_plate IN ('AJI8I17', 'AJI8I19') OR oc.vehicle_plate LIKE 'TIPO%');

UPDATE public.maintenance_records mr
SET vehicle_plate = v.plate, updated_at = now()
FROM public.vehicles v
WHERE v.id = mr.vehicle_id
  AND v.type IN ('Caminhão (Truck)', 'Caminhão (3/4)')
  AND (mr.vehicle_plate IN ('AJI8I17', 'AJI8I19') OR mr.vehicle_plate LIKE 'TIPO%');
