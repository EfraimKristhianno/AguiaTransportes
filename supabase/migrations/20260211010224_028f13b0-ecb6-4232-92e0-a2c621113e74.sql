-- Re-create trigger for logging delivery status changes (creates history entries)
CREATE TRIGGER on_delivery_status_change
  AFTER INSERT OR UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_delivery_status_change();

-- Re-create trigger for notifying drivers on new requests
CREATE TRIGGER on_new_delivery_request_notify
  AFTER INSERT OR UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_driver_on_new_request();