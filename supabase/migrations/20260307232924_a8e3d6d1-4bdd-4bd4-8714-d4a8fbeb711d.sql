
-- Delete all status history first (FK dependency)
DELETE FROM delivery_request_status_history;

-- Delete all delivery requests
DELETE FROM delivery_requests;

-- Reset request_number sequence
ALTER SEQUENCE delivery_requests_request_number_seq RESTART WITH 1;

-- Delete vehicle logs (abastecimento)
DELETE FROM vehicle_logs;

-- Delete oil change records (troca de óleo)
DELETE FROM oil_change_records;

-- Delete maintenance records (manutenção)
DELETE FROM maintenance_records;
