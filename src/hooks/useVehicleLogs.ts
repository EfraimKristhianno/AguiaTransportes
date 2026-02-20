import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentDriver } from '@/hooks/useDriverRequests';
import { toast } from 'sonner';

export interface VehicleLog {
  id: string;
  vehicle_id: string;
  driver_id: string;
  log_date: string;
  km_initial: number;
  km_final: number;
  km_total: number;
  liters: number | null;
  fuel_price: number | null;
  total_cost: number | null;
  fuel_type: 'gasolina' | 'alcool' | 'diesel';
  vehicle_plate: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  vehicle?: { id: string; plate: string; type: string; brand: string | null; model: string | null };
  driver?: { id: string; name: string };
}

export interface OilChangeRecord {
  id: string;
  vehicle_id: string;
  driver_id: string;
  change_date: string;
  km_at_change: number;
  next_change_km: number;
  oil_type: string | null;
  vehicle_plate: string | null;
  notes: string | null;
  created_at: string;
  vehicle?: { id: string; plate: string; type: string };
  driver?: { id: string; name: string };
}

export const useVehicleLogs = () => {
  const { role } = useAuth();
  const { data: currentDriver } = useCurrentDriver();
  const isDriverOnly = role === 'motorista';

  return useQuery({
    queryKey: ['vehicle_logs', currentDriver?.id, role],
    enabled: role === 'admin' || role === 'gestor' || !!currentDriver?.id,
    queryFn: async () => {
      let query = supabase
        .from('vehicle_logs')
        .select('*, vehicle:vehicles(id, plate, type, brand, model), driver:drivers(id, name)')
        .order('log_date', { ascending: false });

      if (isDriverOnly && currentDriver?.id) {
        query = query.eq('driver_id', currentDriver.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as VehicleLog[];
    },
  });
};

export const useOilChangeRecords = () => {
  const { role } = useAuth();
  const { data: currentDriver } = useCurrentDriver();
  const isDriverOnly = role === 'motorista';

  return useQuery({
    queryKey: ['oil_change_records', currentDriver?.id, role],
    enabled: role === 'admin' || role === 'gestor' || !!currentDriver?.id,
    queryFn: async () => {
      let query = supabase
        .from('oil_change_records')
        .select('*, vehicle:vehicles(id, plate, type), driver:drivers(id, name)')
        .order('change_date', { ascending: false });

      if (isDriverOnly && currentDriver?.id) {
        query = query.eq('driver_id', currentDriver.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as OilChangeRecord[];
    },
  });
};

export const useCreateVehicleLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (log: {
      vehicle_id: string;
      driver_id: string;
      log_date: string;
      km_initial: number;
      km_final: number;
      liters?: number;
      fuel_price?: number;
      total_cost?: number;
      fuel_type: string;
      vehicle_plate?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.from('vehicle_logs').insert(log).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_logs'] });
      toast.success('Registro salvo com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar registro: ' + error.message);
    },
  });
};

export const useCreateOilChange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      vehicle_id: string;
      driver_id: string;
      change_date: string;
      km_at_change: number;
      next_change_km: number;
      oil_type?: string;
      service_cost?: number;
      vehicle_plate?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.from('oil_change_records').insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oil_change_records'] });
      toast.success('Troca de óleo registrada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao registrar troca: ' + error.message);
    },
  });
};

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  driver_id: string;
  maintenance_type: 'preventiva' | 'corretiva' | 'preditiva';
  vehicle_plate: string;
  current_km: number;
  service_cost: number | null;
  notes: string | null;
  maintenance_date: string;
  created_at: string;
  vehicle?: { id: string; plate: string; type: string };
  driver?: { id: string; name: string };
}

export const useMaintenanceRecords = () => {
  const { role } = useAuth();
  const { data: currentDriver } = useCurrentDriver();
  const isDriverOnly = role === 'motorista';

  return useQuery({
    queryKey: ['maintenance_records', currentDriver?.id, role],
    enabled: role === 'admin' || role === 'gestor' || !!currentDriver?.id,
    queryFn: async () => {
      let query = supabase
        .from('maintenance_records')
        .select('*, vehicle:vehicles(id, plate, type), driver:drivers(id, name)')
        .order('maintenance_date', { ascending: false });

      if (isDriverOnly && currentDriver?.id) {
        query = query.eq('driver_id', currentDriver.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as MaintenanceRecord[];
    },
  });
};

export const useCreateMaintenanceRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      vehicle_id: string;
      driver_id: string;
      maintenance_type: string;
      vehicle_plate: string;
      current_km: number;
      service_cost?: number;
      notes?: string;
      maintenance_date: string;
    }) => {
      const { data, error } = await supabase.from('maintenance_records').insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_records'] });
      toast.success('Manutenção registrada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao registrar manutenção: ' + error.message);
    },
  });
};
