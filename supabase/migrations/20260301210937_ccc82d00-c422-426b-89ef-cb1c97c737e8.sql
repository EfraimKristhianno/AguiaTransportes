
-- Delete status history first (FK dependency)
DELETE FROM delivery_request_status_history;

-- Delete all delivery requests
DELETE FROM delivery_requests;

-- Delete all maintenance records
DELETE FROM maintenance_records;

-- Delete all oil change records
DELETE FROM oil_change_records;

-- Delete all vehicle logs (fuel)
DELETE FROM vehicle_logs;
