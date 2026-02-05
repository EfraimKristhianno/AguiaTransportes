import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User, UserWithRole, UserRole, DriverVehicleType } from '@/types/database';
import { toast } from 'sonner';

// Fetch driver vehicle types for a user
export const useDriverVehicleTypes = (authId: string | undefined) => {
  return useQuery({
    queryKey: ['driverVehicleTypes', authId],
    queryFn: async (): Promise<string[]> => {
      if (!authId) return [];
      
      // First get the driver record for this auth_id
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', authId)
        .single();
      
      if (driverError || !driver) return [];
      
      // Then get the vehicle types for this driver
      const { data: vehicleTypes, error } = await supabase
        .from('driver_vehicle_types')
        .select('vehicle_type')
        .eq('driver_id', driver.id);
      
      if (error) return [];
      
      return vehicleTypes?.map((vt: { vehicle_type: string }) => vt.vehicle_type) || [];
    },
    enabled: !!authId,
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<UserWithRole[]> => {
      // Fetch users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Map roles to users
      const usersWithRoles: UserWithRole[] = (users || []).map((user: any) => {
        const userRole = roles?.find((r: any) => r.user_id === user.auth_id);
        return {
          ...user,
          role: (userRole?.role as UserRole) || 'cliente',
        };
      });

      return usersWithRoles;
    },
  });
};

export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: async (): Promise<UserWithRole | null> => {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      if (!user) return null;

      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.auth_id)
        .single();

      if (roleError && roleError.code !== 'PGRST116') throw roleError;

      return {
        ...user,
        role: (role?.role as UserRole) || 'cliente',
      };
    },
    enabled: !!userId,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      name,
      phone,
      role,
    }: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      role: UserRole;
    }) => {
      // Use Edge Function to create user without logging out current user
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Sessão não encontrada. Faça login novamente.');
      }

      const response = await supabase.functions.invoke('create-user', {
        body: { email, password, name, phone, role },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao criar usuário');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário cadastrado com sucesso');
    },
    onError: (error: Error) => {
      const message = error.message.toLowerCase();
      if (message.includes('já está cadastrado') || message.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error(error.message);
      }
    },
  });
};

// Helper function to save driver vehicle types
export const useSaveDriverVehicleTypes = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      authId,
      vehicleTypes,
    }: {
      authId: string;
      vehicleTypes: string[];
    }) => {
      // First get the driver record for this auth_id
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', authId)
        .single();
      
      if (driverError || !driver) {
        // Driver doesn't exist yet, need to create one
        return;
      }
      
      // Delete existing vehicle types
      await supabase
        .from('driver_vehicle_types')
        .delete()
        .eq('driver_id', driver.id);
      
      // Insert new vehicle types
      if (vehicleTypes.length > 0) {
        const { error: insertError } = await supabase
          .from('driver_vehicle_types')
          .insert(
            vehicleTypes.map(vt => ({
              driver_id: driver.id,
              vehicle_type: vt,
            }))
          );
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['driverVehicleTypes', variables.authId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar tipos de veículo: ${error.message}`);
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      authId,
      updates,
      role,
    }: {
      userId: string;
      authId: string;
      updates: Partial<User>;
      role?: UserRole;
    }) => {
      // Update user
      const { error: userError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (userError) throw userError;

      // Update role if provided
      if (role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({ user_id: authId, role }, { onConflict: 'user_id' });

        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    },
  });
};

export const useCurrentUserRole = () => {
  return useQuery({
    queryKey: ['currentUserRole'],
    queryFn: async (): Promise<UserRole | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError) return 'cliente';

      return role?.role as UserRole || 'cliente';
    },
  });
};
