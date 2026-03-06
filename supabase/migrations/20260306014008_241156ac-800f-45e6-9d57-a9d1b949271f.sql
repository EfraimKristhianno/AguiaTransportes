
-- Drop all triggers that use notify_driver_on_new_request
DROP TRIGGER IF EXISTS notify_driver_on_new_request ON public.delivery_requests;
DROP TRIGGER IF EXISTS trigger_notify_driver_new_request ON public.delivery_requests;
DROP TRIGGER IF EXISTS on_new_delivery_request_notify ON public.delivery_requests;
DROP TRIGGER IF EXISTS on_delivery_request_notify_driver ON public.delivery_requests;

-- Now drop the function
DROP FUNCTION IF EXISTS public.notify_driver_on_new_request();

-- Drop push_subscriptions table
DROP TABLE IF EXISTS public.push_subscriptions;
