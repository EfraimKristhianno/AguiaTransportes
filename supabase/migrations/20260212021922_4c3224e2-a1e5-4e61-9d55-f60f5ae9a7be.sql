
-- Trigger para registrar histórico de status
DROP TRIGGER IF EXISTS on_delivery_status_change ON public.delivery_requests;
CREATE TRIGGER on_delivery_status_change
  AFTER INSERT OR UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_delivery_status_change();

-- Trigger para notificar motoristas via OneSignal (push em segundo plano)
DROP TRIGGER IF EXISTS on_new_delivery_request_notify ON public.delivery_requests;
CREATE TRIGGER on_new_delivery_request_notify
  AFTER INSERT OR UPDATE ON public.delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_driver_on_new_request();
