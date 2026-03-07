
CREATE OR REPLACE FUNCTION public.notify_on_new_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url text := 'https://ktdhzfavmpfkcrwahdvm.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0ZGh6ZmF2bXBma2Nyd2FoZHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzUzMjcsImV4cCI6MjA4NTY1MTMyN30.AqZFk5ptJOITrpOhSqKSJvC1hMdIOCbQjAYQeKhjREM';
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/notify-driver',
      body := jsonb_build_object(
        'request_number', NEW.request_number,
        'origin_address', NEW.origin_address,
        'destination_address', NEW.destination_address,
        'transport_type', NEW.transport_type
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_delivery_request
AFTER INSERT ON public.delivery_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_request();
