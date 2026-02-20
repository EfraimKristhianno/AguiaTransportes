
ALTER TABLE vehicle_logs ADD COLUMN vehicle_plate text;
ALTER TABLE oil_change_records ADD COLUMN vehicle_plate text;

UPDATE vehicle_logs vl SET vehicle_plate = v.plate FROM vehicles v WHERE v.id = vl.vehicle_id;
UPDATE oil_change_records oc SET vehicle_plate = v.plate FROM vehicles v WHERE v.id = oc.vehicle_id;
