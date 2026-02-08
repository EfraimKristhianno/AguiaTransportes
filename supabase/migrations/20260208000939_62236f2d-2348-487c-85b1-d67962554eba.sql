
-- Add invoice_number (Nota Fiscal) and op_number (O.P.) columns to delivery_requests
ALTER TABLE public.delivery_requests
ADD COLUMN invoice_number text,
ADD COLUMN op_number text,
ADD COLUMN requester_phone text;
