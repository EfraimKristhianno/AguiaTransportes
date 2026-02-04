import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Driver, DriverWithStats } from '@/types/database';
import { toast } from 'sonner';

export const useDrivers = () => {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async (): Promise<DriverWithStats[]> => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For now, return with default stats - can be enhanced with delivery counts later
      const driversWithStats: DriverWithStats[] = (data || []).map((driver: any) => ({
        ...driver,
        total_deliveries: 0,
        completed_deliveries: 0,
        active_deliveries: 0,
      }));

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
      return data;
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
