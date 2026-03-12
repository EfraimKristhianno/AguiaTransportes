import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { brazilNowISO } from '@/lib/utils';

interface UseDriverLocationTrackingProps {
  driverId: string | null;
  activeDeliveryRequestId: string | null;
  enabled: boolean;
}

export const useDriverLocationTracking = ({
  driverId,
  activeDeliveryRequestId,
  enabled,
}: UseDriverLocationTrackingProps) => {
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  const sendLocation = useCallback(
    async (position: GeolocationPosition) => {
      if (!driverId || !enabled) return;

      const now = Date.now();
      // Throttle to every 3 seconds for near-realtime tracking
      if (now - lastSentRef.current < 3000) return;
      lastSentRef.current = now;

      const { latitude, longitude, heading, speed } = position.coords;

      const payload: Record<string, unknown> = {
        driver_id: driverId,
        latitude,
        longitude,
        heading: heading ?? null,
        speed: speed ?? null,
        delivery_request_id: activeDeliveryRequestId,
        updated_at: brazilNowISO(),
      };

      // Upsert based on unique driver_id
      await supabase
        .from('driver_locations' as any)
        .upsert(payload as any, { onConflict: 'driver_id' });
    },
    [driverId, activeDeliveryRequestId, enabled]
  );

  useEffect(() => {
    if (!enabled || !driverId || !navigator.geolocation) {
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      (err) => {
        console.warn('Geolocation error:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, driverId, sendLocation]);
};
