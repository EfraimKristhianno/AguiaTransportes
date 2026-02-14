import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FreightPrice {
  id: string;
  client_id: string;
  transport_type: string;
  region: string;
  price: number;
}

export const useFreightPrices = (clientId?: string | null) => {
  return useQuery({
    queryKey: ['freightPrices', clientId],
    queryFn: async () => {
      let query = supabase
        .from('freight_prices' as any)
        .select('*');

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as FreightPrice[];
    },
    enabled: !!clientId,
    refetchOnWindowFocus: false,
  });
};

export const useAllFreightPrices = () => {
  return useQuery({
    queryKey: ['allFreightPrices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('freight_prices' as any)
        .select('*');
      if (error) throw error;
      return (data || []) as unknown as FreightPrice[];
    },
    refetchOnWindowFocus: false,
  });
};

export const getFreightPricesForRequest = (
  prices: FreightPrice[],
  clientId: string | null | undefined,
  transportType: string | null | undefined
): FreightPrice[] => {
  if (!clientId || !transportType) return [];
  return prices.filter(
    p => p.client_id === clientId && p.transport_type === transportType
  );
};

export const formatFreightPrices = (prices: FreightPrice[]): string => {
  if (prices.length === 0) return '-';
  return prices
    .map(p => `${p.region} - R$ ${Number(p.price).toFixed(2).replace('.', ',')}`)
    .join(' / ');
};
