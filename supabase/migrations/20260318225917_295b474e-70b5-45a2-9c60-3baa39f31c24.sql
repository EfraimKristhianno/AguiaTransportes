UPDATE delivery_requests 
SET scheduled_date = scheduled_date + interval '3 hours'
WHERE request_number = 133 
AND scheduled_date = '2026-03-18 10:50:00+00';