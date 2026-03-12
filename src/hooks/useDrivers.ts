import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Driver, DriverWithStats } from '@/types/database';
import { toast } from 'sonner';
import { brazilNowISO } from '@/lib/utils';

export const useDrivers = () => {
  return useQuery({
    queryKey: ['drivers'],
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<DriverWithStats[]> => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch delivery stats per driver
      const { data: deliveries } = await supabase
        .from('delivery_requests')
        .select('driver_id, status')
        .not('driver_id', 'is', null);

      const statsMap: Record<string, { total: number; completed: number; active: number }> = {};
      deliveries?.forEach((d) => {
        const dId = d.driver_id!;
        if (!statsMap[dId]) statsMap[dId] = { total: 0, completed: 0, active: 0 };
        statsMap[dId].total++;
        if (d.status === 'entregue') statsMap[dId].completed++;
        if (['aceita', 'pendente_coleta', 'coletada', 'em_rota', 'pendente_entrega'].includes(d.status || '')) statsMap[dId].active++;
      });

      const driversWithStats: DriverWithStats[] = (data || []).map((driver: any) => {
        const active = statsMap[driver.id]?.active || 0;
        const computedStatus = active > 0 ? 'unavailable' : 'available';
        return {
          ...driver,
          status: computedStatus,
          total_deliveries: statsMap[driver.id]?.total || 0,
          completed_deliveries: statsMap[driver.id]?.completed || 0,
          active_deliveries: active,
        };
      });

      // Ordenar por total de corridas (maior para menor)
      driversWithStats.sort((a, b) => b.total_deliveries - a.total_deliveries);

      return driversWithStats;
    },
  });
};

export const useDriver = (driverId: string) => {
  return useQuery({
    queryKey: ['drivers', driverId],
    queryFn: async (): Promise<Driver | null> => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .single();

      if (error) throw error;
      
      // Cast status to the expected union type
      return data ? {
        ...data,
        status: (data.status as Driver['status']) || 'available',
      } : null;
    },
    enabled: !!driverId,
  });
};

export const useCreateDriver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('drivers')
        .insert(driver)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Motorista criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar motorista: ${error.message}`);
    },
  });
};

export const useUpdateDriver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      driverId,
      updates,
    }: {
      driverId: string;
      updates: Partial<Driver>;
    }) => {
      const { data, error } = await supabase
        .from('drivers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', driverId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Motorista atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar motorista: ${error.message}`);
    },
  });
};

export const useDeleteDriver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', driverId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Motorista excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir motorista: ${error.message}`);
    },
  });
};
