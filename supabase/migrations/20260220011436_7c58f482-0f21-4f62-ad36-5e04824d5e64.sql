-- Create trigger to call notify_driver_on_new_request on delivery_requests insert/update
CREATE TRIGGER on_delivery_request_notify_driver
  AFTER INSERT OR UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_driver_on_new_request();