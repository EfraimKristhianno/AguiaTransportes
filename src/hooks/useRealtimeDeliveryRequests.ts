import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeDeliveryRequests = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('realtime-delivery-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_requests' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['delivery_requests'] });
          queryClient.invalidateQueries({ queryKey: ['deliveryRequests'] });
          queryClient.invalidateQueries({ queryKey: ['driverRequests'] });
          queryClient.invalidateQueries({ queryKey: ['nextRequestNumber'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_request_status_history' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['request_history'] });
          queryClient.invalidateQueries({ queryKey: ['delivery_requests'] });
          queryClient.invalidateQueries({ queryKey: ['deliveryRequests'] });
          queryClient.invalidateQueries({ queryKey: ['driverRequests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
