import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that listens for new delivery_requests via Supabase Realtime
 * and shows a native browser Notification to the driver (fallback when tab is open).
 * The primary push mechanism is Web Push via Service Worker + notify-driver edge function.
 */
export const useDriverNotifications = (isDriver: boolean) => {
  const lastNotifiedId = useRef<string | null>(null);

  useEffect(() => {
    if (!isDriver) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    console.log('[DriverNotifications] Setting up Realtime notification listener (fallback)');

    const channel = supabase
      .channel('driver-push-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_requests' },
        (payload) => {
          const newRequest = payload.new as any;
          
          if (lastNotifiedId.current === newRequest.id) return;
          lastNotifiedId.current = newRequest.id;

          // Only show in-browser notification if document is visible (push SW handles background)
          if (document.visibilityState !== 'visible') return;

          const requestNum = String(newRequest.request_number || 0).padStart(6, '0');
          const origin = newRequest.origin_address || 'N/A';
          const destination = newRequest.destination_address || 'N/A';
          const transportType = newRequest.transport_type || '';

          console.log('[DriverNotifications] New request detected:', requestNum);

          try {
            new Notification(`Nova Solicitação #${requestNum}`, {
              body: `Coleta: ${origin} → ${destination}${transportType ? ` (${transportType})` : ''}`,
              icon: '/logo-192.png',
              tag: `request-${newRequest.id}`,
            });
          } catch (e) {
            console.error('[DriverNotifications] Error showing notification:', e);
          }
        }
      )
      .subscribe((status) => {
        console.log('[DriverNotifications] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDriver]);
};
