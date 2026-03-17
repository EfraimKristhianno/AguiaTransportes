
-- Move freight prices from duplicate Buhler CS to the original one
UPDATE freight_prices 
SET client_id = '4befa167-2697-419f-a63c-68f78b237059'
WHERE client_id = '3de8e579-5279-489d-97d3-52482a82d89e';

-- Delete the duplicate Buhler CS client
DELETE FROM clients WHERE id = '3de8e579-5279-489d-97d3-52482a82d89e';
