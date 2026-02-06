import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StatusHistoryEntry {
  id: string;
  delivery_request_id: string;
  status: string;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

export const useRequestHistory = (requestId: string | null) => {
  return useQuery({
    queryKey: ['request_history', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_request_status_history')
        .select('*')
        .eq('delivery_request_id', requestId!)
        .order('changed_at', { ascending: true });
      if (error) throw error;
      return data as StatusHistoryEntry[];
    },
  });
};
