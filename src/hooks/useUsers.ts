import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User, UserWithRole, UserRole } from '@/types/database';
import { toast } from 'sonner';

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
      // Create auth user via Supabase Admin API (requires service role or edge function)
      // For now, we'll use signUp and handle the user creation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      // Create user profile in users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_id: authData.user.id,
          name,
          email,
          phone: phone || null,
        });

      if (userError) throw userError;

      // Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role,
        });

      if (roleError) throw roleError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário cadastrado com sucesso');
    },
    onError: (error: Error) => {
      const message = error.message.toLowerCase();
      if (message.includes('user_already_exists') || message.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error(`Erro ao cadastrar usuário: ${error.message}`);
      }
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
