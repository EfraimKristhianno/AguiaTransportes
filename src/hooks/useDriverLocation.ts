import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  updated_at: string;
  delivery_request_id: string | null;
}

export const useDriverLocation = (driverId: string | null) => {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!driverId) {
      setIsLoading(false);
      return;
    }

    // Fetch initial location
    const fetchLocation = async () => {
      const { data } = await supabase
        .from('driver_locations' as any)
        .select('*')
        .eq('driver_id', driverId)
        .single();

      if (data) {
        const d = data as any;
        setLocation({
          latitude: d.latitude,
          longitude: d.longitude,
          heading: d.heading,
          speed: d.speed,
          updated_at: d.updated_at,
          delivery_request_id: d.delivery_request_id,
        });
      }
      setIsLoading(false);
    };

    fetchLocation();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`driver-location-${driverId}`)
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
            setLocation({
              latitude: d.latitude,
              longitude: d.longitude,
              heading: d.heading,
              speed: d.speed,
              updated_at: d.updated_at,
              delivery_request_id: d.delivery_request_id,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return { location, isLoading };
};
