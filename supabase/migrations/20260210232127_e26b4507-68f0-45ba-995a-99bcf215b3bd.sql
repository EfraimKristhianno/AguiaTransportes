
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to notify drivers via edge function
CREATE OR REPLACE FUNCTION public.notify_driver_on_new_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payload jsonb;
  supabase_url text := 'https://ktdhzfavmpfkcrwahdvm.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0ZGh6ZmF2bXBma2Nyd2FoZHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzUzMjcsImV4cCI6MjA4NTY1MTMyN30.AqZFk5ptJOITrpOhSqKSJvC1hMdIOCbQjAYQeKhjREM';
BEGIN
  -- Only trigger for relevant statuses
  IF NEW.status IN ('solicitada', 'enviada') THEN
    -- Only on INSERT or when status actually changed
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
      payload := jsonb_build_object(
        'type', TG_OP,
        'record', row_to_json(NEW)::jsonb
      );

      PERFORM extensions.http_post(
        url := supabase_url || '/functions/v1/notify-driver',
        body := payload::text,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key
        )::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on delivery_requests
DROP TRIGGER IF EXISTS trigger_notify_driver_new_request ON public.delivery_requests;
CREATE TRIGGER trigger_notify_driver_new_request
  AFTER INSERT OR UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_driver_on_new_request();
