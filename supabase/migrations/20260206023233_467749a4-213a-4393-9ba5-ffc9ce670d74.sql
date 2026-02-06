-- Update default status from 'pending' to 'solicitada' for new requests
ALTER TABLE public.delivery_requests ALTER COLUMN status SET DEFAULT 'solicitada';

-- Add a request_number column for unique sequential ID per request
ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS request_number SERIAL;

-- Create index on request_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_delivery_requests_request_number ON public.delivery_requests(request_number);