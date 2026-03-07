
CREATE OR REPLACE FUNCTION public.reset_request_number_sequence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_num integer;
BEGIN
  SELECT COALESCE(MAX(request_number), 0) INTO max_num FROM delivery_requests;
  PERFORM setval('delivery_requests_request_number_seq', GREATEST(max_num, 1), max_num > 0);
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_reset_request_number_after_delete
AFTER DELETE ON delivery_requests
FOR EACH STATEMENT
EXECUTE FUNCTION reset_request_number_sequence();
