-- Enable realtime for delivery_requests and delivery_request_status_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_request_status_history;