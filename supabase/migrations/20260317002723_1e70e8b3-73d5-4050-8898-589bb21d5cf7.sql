
-- Move all delivery_requests from "Bühler Group" to existing "Buhler ML"
UPDATE delivery_requests 
SET client_id = '3e663cae-6959-432f-947a-14916e6322de'
WHERE client_id = '0b7002f0-efe6-4466-9476-1d41f6dc1aaf';

-- Delete freight prices from Bühler Group (Buhler ML already has the same prices)
DELETE FROM freight_prices WHERE client_id = '0b7002f0-efe6-4466-9476-1d41f6dc1aaf';

-- Delete the Bühler Group client record
DELETE FROM clients WHERE id = '0b7002f0-efe6-4466-9476-1d41f6dc1aaf';

-- Also clean up the duplicate "Buhler Group" (without ü) - move its prices to Buhler ML if not duplicated, then delete
DELETE FROM freight_prices WHERE client_id = '529faa8b-fee8-4a89-bdb8-c22ad74bbe64';
DELETE FROM clients WHERE id = '529faa8b-fee8-4a89-bdb8-c22ad74bbe64';
