import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const isDev = import.meta.env.DEV;

export const useRealtimeDeliveryRequests = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isDev) console.log('[Realtime] Setting up delivery requests channel...');
    
    const invalidateAll = (source: string) => {
      if (isDev) console.log(`[Realtime] Invalidating queries from: ${source}`);
      queryClient.invalidateQueries({ queryKey: ['delivery_requests'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryRequests'] });
      queryClient.invalidateQueries({ queryKey: ['driverRequests'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryRequestDetail'] });
      queryClient.invalidateQueries({ queryKey: ['request_history'] });
      queryClient.invalidateQueries({ queryKey: ['nextRequestNumber'] });
      queryClient.invalidateQueries({ queryKey: ['currentDriver'] });
    };

    const channel = supabase
      .channel('realtime-delivery-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_requests' },
        (payload) => {
          if (isDev) console.log('[Realtime] delivery_requests change:', payload.eventType);
          invalidateAll('delivery_requests');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_request_status_history' },
        (payload) => {
          if (isDev) console.log('[Realtime] status_history change:', payload.eventType);
          invalidateAll('status_history');
        }
      )
      .subscribe((status) => {
        if (isDev) console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      if (isDev) console.log('[Realtime] Removing channel');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
