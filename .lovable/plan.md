

## Analysis

The notification system is **already fully implemented**:

1. **OneSignal SDK** is initialized in `index.html` with appId `bde63d28-81f0-4d42-a195-99ed3b24a541`
2. **Edge Function `notify-driver`** exists and sends push notifications via OneSignal REST API to users tagged as `role=motorista`
3. **Frontend call** in `RequestForm.tsx` (line 286) already invokes `notify-driver` when a request is created
4. **Driver tagging** in `AuthContext.tsx` tags drivers with `role=motorista` and their transport types on login
5. **Background delivery** is configured with `content_available: true` and `priority: 10`

However, the edge function logs show the error: **"All included players are not subscribed"** -- meaning no drivers have successfully subscribed to push notifications in OneSignal.

## The Real Problem

The notification infrastructure is in place. The issue is that **drivers are not subscribing to OneSignal push notifications**. This can happen because:

1. `autoPrompt: false` is set in OneSignal init -- permission is only requested programmatically for drivers on login
2. The permission request may fail silently on mobile browsers (especially iOS Safari where web push has restrictions)
3. Drivers may have denied the permission prompt

## Proposed Approach: Database Trigger for Reliability

To make it more robust and ensure notifications are sent even when clients create requests (not just from the frontend), we can add a **database trigger** that calls the `notify-driver` edge function automatically on INSERT into `delivery_requests`. This way notifications are triggered server-side regardless of the client app.

### Changes

1. **Create a database trigger** on `delivery_requests` table that fires on INSERT and calls the `notify-driver` edge function via `pg_net` (similar to the existing `notify_on_status_change` trigger)

2. **Remove the frontend call** to `notify-driver` in `RequestForm.tsx` to avoid duplicate notifications

3. **Update the `notify-driver` edge function** to accept the trigger payload format (which sends `record` and `old_record` as JSON) and extract the needed fields from the new record

4. **Add `android_sound` and `ios_sound` parameters** to the OneSignal payload for audible notifications

### Database Trigger SQL

```sql
CREATE OR REPLACE FUNCTION public.notify_on_new_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url text := 'https://ktdhzfavmpfkcrwahdvm.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
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
```

### Edge Function Update (`notify-driver`)

- Add `android_sound: "default"` and `ios_sound: "default"` to the OneSignal payload for audible alerts
- Keep existing payload format (no change needed since trigger sends same fields)

### Frontend Cleanup (`RequestForm.tsx`)

- Remove the `supabase.functions.invoke('notify-driver', ...)` block (lines 284-296) since the trigger now handles it

### Files Modified
- `supabase/functions/notify-driver/index.ts` -- add sound parameters
- `src/components/solicitacoes/RequestForm.tsx` -- remove manual notification call
- Database migration -- create trigger function and trigger

