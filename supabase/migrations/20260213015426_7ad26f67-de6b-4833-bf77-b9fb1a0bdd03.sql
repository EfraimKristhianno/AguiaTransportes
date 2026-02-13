
-- Drop and recreate triggers to ensure they're correct
DROP TRIGGER IF EXISTS on_delivery_status_change ON public.delivery_requests;
DROP TRIGGER IF EXISTS on_new_delivery_request_notify ON public.delivery_requests;
DROP TRIGGER IF EXISTS update_delivery_requests_updated_at ON public.delivery_requests;
DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_vehicle_logs_updated_at ON public.vehicle_logs;

-- Recreate trigger for logging status changes to history
CREATE TRIGGER on_delivery_status_change
  AFTER INSERT OR UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_delivery_status_change();

-- Recreate trigger for sending push notifications via edge function
CREATE TRIGGER on_new_delivery_request_notify
  AFTER INSERT OR UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_driver_on_new_request();

-- Recreate updated_at triggers
CREATE TRIGGER update_delivery_requests_updated_at
  BEFORE UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicle_logs_updated_at
  BEFORE UPDATE ON public.vehicle_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure tables are in the realtime publication (ignore if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_requests;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_request_status_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_request_status_history;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'drivers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
  END IF;
END $$;
