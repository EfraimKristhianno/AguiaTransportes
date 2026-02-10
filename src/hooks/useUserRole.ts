import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/database';

export const useUserRole = () => {
  return useQuery({
    queryKey: ['currentUserRole'],
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<UserRole | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Fetch role from user_roles table
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no role found, check if this is the first user (admin)
        const { count } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true });

        // First user becomes admin
        if (count === 0) {
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'admin' });
          
          if (!insertError) {
            return 'admin';
          }
        }
        
        return 'cliente'; // Default role
      }

      return roleData?.role as UserRole || 'cliente';
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

// Permission helpers
export const canAccessRoute = (role: UserRole | null | undefined, route: string): boolean => {
  if (!role) return false;

  const permissions: Record<UserRole, string[]> = {
    admin: ['/dashboard', '/solicitacoes', '/usuarios', '/motoristas', '/clientes'],
    gestor: ['/dashboard', '/solicitacoes', '/motoristas', '/clientes'],
    motorista: ['/dashboard', '/solicitacoes'],
    cliente: ['/dashboard', '/solicitacoes'],
  };

  return permissions[role]?.includes(route) || false;
};

export const getDefaultRoute = (role: UserRole | null | undefined): string => {
  if (!role) return '/';
  
  const defaultRoutes: Record<UserRole, string> = {
    admin: '/dashboard',
    gestor: '/dashboard',
    motorista: '/dashboard',
    cliente: '/dashboard',
  };

  return defaultRoutes[role] || '/solicitacoes';
};
