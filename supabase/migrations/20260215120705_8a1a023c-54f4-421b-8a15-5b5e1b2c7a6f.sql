
-- Delete all status history first (foreign key dependency)
DELETE FROM delivery_request_status_history;

-- Delete all delivery requests
DELETE FROM delivery_requests;

-- Reset the request_number sequence to 1
ALTER SEQUENCE delivery_requests_request_number_seq RESTART WITH 1;
