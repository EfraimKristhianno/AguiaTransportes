
-- Delete status history first (FK dependency)
DELETE FROM public.delivery_request_status_history;

-- Delete all delivery requests
DELETE FROM public.delivery_requests;

-- Reset the sequence counter to start from 1
ALTER SEQUENCE public.delivery_requests_request_number_seq RESTART WITH 1;
