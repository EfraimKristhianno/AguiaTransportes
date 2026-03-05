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
        .from('freight_prices')
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
        .from('freight_prices')
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
  transportType: string | null | undefined,
  region?: string | null
): FreightPrice[] => {
  if (!clientId || !transportType) return [];
  let filtered = prices.filter(
    p => p.client_id === clientId && p.transport_type === transportType
  );
  if (region) {
    filtered = filtered.filter(p => p.region === region);
  }
  return filtered;
};

export const formatFreightPrices = (prices: FreightPrice[]): string => {
  if (prices.length === 0) return '-';
  return prices
    .map(p => `${p.region} - R$ ${Number(p.price).toFixed(2).replace('.', ',')}`)
    .join(' / ');
};

/**
 * Formats freight price for display.
 * When resolvedRegion is explicitly null (meaning "A combinar"), returns "A combinar".
 * When prices array is empty and no region context, returns "-".
 */
export const formatSingleFreightPrice = (prices: FreightPrice[], resolvedRegion?: FreightRegion | null): string => {
  // If region was explicitly resolved as null (unknown region), show "A combinar"
  if (resolvedRegion === null && resolvedRegion !== undefined) {
    if (prices.length === 0) return 'A combinar';
  }
  
  if (prices.length === 0) return '-';
  if (prices.length === 1) {
    return `R$ ${Number(prices[0].price).toFixed(2).replace('.', ',')}`;
  }
  return prices
    .map(p => `${p.region}: R$ ${Number(p.price).toFixed(2).replace('.', ',')}`)
    .join(' / ');
};

// Re-export type for convenience
import type { FreightRegion } from '@/lib/regionDetection';
export type { FreightRegion };
