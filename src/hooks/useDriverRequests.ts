import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DriverRequest {
  id: string;
  request_number: number | null;
  client_id: string | null;
  origin_address: string;
  destination_address: string;
  scheduled_date: string | null;
  material_type_id: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  status: string | null;
  notes: string | null;
  delivered_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  requester: string | null;
  transport_type: string | null;
  attachments: string[] | null;
  clients?: { name: string; phone: string | null; email: string | null } | null;
  material_types?: { name: string } | null;
}

// Hook to get the current driver record linked to the authenticated user
export const useCurrentDriver = () => {
  return useQuery({
    queryKey: ['currentDriver'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('drivers')
        .select('*, driver_vehicle_types(vehicle_type)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
};

// Hook to get delivery requests for the driver:
// 1. Available requests matching transport types (solicitada/enviada)
// 2. Requests already assigned to this driver (aceita/coletada/em_rota/entregue)
export const useDriverRequests = (driverVehicleTypes: string[] = [], driverId?: string) => {
  return useQuery({
    queryKey: ['driverRequests', driverVehicleTypes, driverId],
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<DriverRequest[]> => {
      if (driverVehicleTypes.length === 0 && !driverId) return [];

      const selectQuery = `
        *,
        clients:client_id (name, phone, email),
        material_types:material_type_id (name)
      `;

      // Fetch available requests (matching transport types, not yet accepted)
      const availablePromise = driverVehicleTypes.length > 0
        ? supabase
            .from('delivery_requests')
            .select(selectQuery)
            .in('transport_type', driverVehicleTypes)
            .in('status', ['solicitada', 'enviada'])
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null });

      // Fetch requests assigned to this driver
      const assignedPromise = driverId
        ? supabase
            .from('delivery_requests')
            .select(selectQuery)
            .eq('driver_id', driverId)
            .in('status', ['aceita', 'coletada', 'em_rota'])
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null });

      const [availableResult, assignedResult] = await Promise.all([availablePromise, assignedPromise]);

      if (availableResult.error) throw availableResult.error;
      if (assignedResult.error) throw assignedResult.error;

      // Merge and deduplicate
      const allRequests = [...(assignedResult.data || []), ...(availableResult.data || [])];
      const uniqueMap = new Map(allRequests.map(r => [r.id, r]));
      return Array.from(uniqueMap.values()) as unknown as DriverRequest[];
    },
    enabled: driverVehicleTypes.length > 0 || !!driverId,
  });
};

// Hook to accept a delivery request
export const useAcceptDeliveryRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, driverId }: { requestId: string; driverId: string }) => {
      const { data, error } = await supabase
        .from('delivery_requests')
        .update({ 
          status: 'aceita',
          driver_id: driverId,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverRequests'] });
      queryClient.invalidateQueries({ queryKey: ['delivery_requests'] });
      toast.success('Solicitação aceita com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aceitar solicitação: ${error.message}`);
    },
  });
};
