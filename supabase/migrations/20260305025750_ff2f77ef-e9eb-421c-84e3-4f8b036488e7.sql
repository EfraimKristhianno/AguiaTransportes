-- Create or replace the function to notify on status changes
CREATE OR REPLACE FUNCTION public.notify_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  payload jsonb;
  supabase_url text := 'https://ktdhzfavmpfkcrwahdvm.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0ZGh6ZmF2bXBma2Nyd2FoZHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzUzMjcsImV4cCI6MjA4NTY1MTMyN30.AqZFk5ptJOITrpOhSqKSJvC1hMdIOCbQjAYQeKhjREM';
BEGIN
  -- Only fire on status changes (not initial insert which is handled by notify-driver)
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Skip statuses already handled by notify-driver
    IF NEW.status NOT IN ('solicitada', 'enviada') THEN
      payload := jsonb_build_object(
        'record', row_to_json(NEW)::jsonb,
        'old_record', row_to_json(OLD)::jsonb
      );

      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/notify-status-change',
        body := payload::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_delivery_status_change_notify ON delivery_requests;
CREATE TRIGGER on_delivery_status_change_notify
  AFTER UPDATE ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_status_change();