
-- Add region column to delivery_requests to store detected region from addresses
ALTER TABLE public.delivery_requests ADD COLUMN region text;

-- Update existing requests based on destination_address content
UPDATE public.delivery_requests
SET region = CASE
  WHEN destination_address ILIKE '%Curitiba%' THEN 'Curitiba'
  WHEN destination_address ILIKE '%Araucária%' THEN 'Araucária'
  ELSE 'Metropolitana'
END
WHERE region IS NULL AND destination_address IS NOT NULL;
