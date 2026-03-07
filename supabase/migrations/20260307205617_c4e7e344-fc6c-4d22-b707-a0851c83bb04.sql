-- Delete all status history first (FK dependency)
DELETE FROM delivery_request_status_history;

-- Delete all delivery requests
DELETE FROM delivery_requests;

-- Reset the request_number sequence
ALTER SEQUENCE delivery_requests_request_number_seq RESTART WITH 1;

-- Delete all vehicle operational records
DELETE FROM vehicle_logs;
DELETE FROM oil_change_records;
DELETE FROM maintenance_records;

-- Delete address history
DELETE FROM address_history;