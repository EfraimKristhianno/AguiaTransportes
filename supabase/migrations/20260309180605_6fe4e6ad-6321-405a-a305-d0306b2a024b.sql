-- Fix existing delivery requests where origin address doesn't contain city name
-- and was incorrectly classified as 'Metropolitana'
UPDATE delivery_requests 
SET region = 'Curitiba' 
WHERE origin_address = 'Rua Edmundo Eckstein, 888' 
  AND region = 'Metropolitana';