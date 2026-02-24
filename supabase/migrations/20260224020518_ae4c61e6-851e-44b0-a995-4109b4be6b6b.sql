-- Delete all records from dependent tables first, then main tables
TRUNCATE TABLE delivery_request_status_history CASCADE;
TRUNCATE TABLE delivery_requests CASCADE;
TRUNCATE TABLE vehicle_logs CASCADE;
TRUNCATE TABLE oil_change_records CASCADE;
TRUNCATE TABLE maintenance_records CASCADE;