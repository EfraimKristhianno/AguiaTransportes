import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  updated_at: string;
  delivery_request_id: string | null;
}

const parseLocation = (d: any): DriverLocation => ({
  latitude: d.latitude,
  longitude: d.longitude,
  heading: d.heading,
  speed: d.speed,
  updated_at: d.updated_at,
  delivery_request_id: d.delivery_request_id,
});

export const useDriverLocation = (driverId: string | null) => {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!driverId) {
      setIsLoading(false);
      return;
    }

    const fetchLocation = async () => {
      const { data } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', driverId)
        .maybeSingle();

      if (data) {
        setLocation(parseLocation(data));
      }
      setIsLoading(false);
    };

    fetchLocation();

    // Realtime subscription for instant updates
    const channel = supabase
      .channel(`driver-location-rt-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          const d = payload.new as any;
          if (d) {
            setLocation(parseLocation(d));
          }
        }
      )
      .subscribe();

    // Polling fallback every 5s to guarantee freshness
    pollingRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', driverId)
        .maybeSingle();
      if (data) {
        setLocation(parseLocation(data));
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [driverId]);

  return { location, isLoading };
};
