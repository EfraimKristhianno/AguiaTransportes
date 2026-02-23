import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User, UserWithRole, UserRole } from '@/types/database';
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

      // Fetch drivers with their vehicle types
      const { data: drivers, error: driversError } = await supabase
        .from('drivers')
        .select('id, user_id');

      if (driversError) throw driversError;

      // Fetch all driver vehicle types
      const driverIds = (drivers || []).map(d => d.id);
      const { data: vehicleTypes, error: vehicleTypesError } = await supabase
        .from('driver_vehicle_types')
        .select('driver_id, vehicle_type')
        .in('driver_id', driverIds.length > 0 ? driverIds : ['']);

      if (vehicleTypesError) throw vehicleTypesError;

      // Create a map of auth_id to vehicle types
      const vehicleTypesByAuthId: Record<string, string[]> = {};
      (drivers || []).forEach(driver => {
        if (driver.user_id) {
          vehicleTypesByAuthId[driver.user_id] = (vehicleTypes || [])
            .filter(vt => vt.driver_id === driver.id)
            .map(vt => vt.vehicle_type);
        }
      });

      // Map roles to users
      const usersWithRoles: UserWithRole[] = (users || []).map((user: any) => {
        const userRole = roles?.find((r: any) => r.user_id === user.auth_id);
        const role = (userRole?.role as UserRole) || 'cliente';
        return {
          ...user,
          role,
          vehicleTypes: role === 'motorista' ? (vehicleTypesByAuthId[user.auth_id] || []) : undefined,
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
      userName,
      userEmail,
      userPhone,
    }: {
      authId: string;
      vehicleTypes: string[];
      userName?: string;
      userEmail?: string;
      userPhone?: string;
    }) => {
      // First get the driver record for this auth_id
      let { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', authId)
        .single();
      
      if (driverError || !driver) {
        // Driver doesn't exist yet, create one
        const { data: newDriver, error: createError } = await supabase
          .from('drivers')
          .insert({
            user_id: authId,
            name: userName || 'Motorista',
            email: userEmail || null,
            phone: userPhone || null,
            status: 'available',
            is_fixed: true,
          })
          .select('id')
          .single();
        
        if (createError || !newDriver) {
          throw new Error('Erro ao criar registro de motorista');
        }
        
        driver = newDriver;
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
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
      previousEmail,
    }: {
      userId: string;
      authId: string;
      updates: Partial<User>;
      role?: UserRole;
      previousEmail?: string;
    }) => {
      // Update user profile
      const { error: userError } = await supabase
        .from('users')
        .update({ name: updates.name, phone: updates.phone })
        .eq('id', userId);

      if (userError) throw userError;

      // If email changed, call edge function to update auth + all related tables
      if (updates.email && previousEmail && updates.email.toLowerCase() !== previousEmail.toLowerCase()) {
        const response = await supabase.functions.invoke('update-user-email', {
          body: { authId, newEmail: updates.email },
        });

        if (response.error) {
          throw new Error(response.error.message || 'Erro ao atualizar email');
        }
        if (response.data?.error) {
          throw new Error(response.data.error);
        }
      }

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

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ authId }: { authId: string }) => {
      const response = await supabase.functions.invoke('delete-user', {
        body: { authId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao excluir usuário');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useResetUserPassword = () => {
  return useMutation({
    mutationFn: async ({ authId, newPassword }: { authId: string; newPassword: string }) => {
      const response = await supabase.functions.invoke('reset-password', {
        body: { authId, newPassword },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao redefinir senha');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success('Senha redefinida com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
