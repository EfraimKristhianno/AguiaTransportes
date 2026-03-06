// Auth context with role management
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  roleLoading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    setRoleLoading(true);
    try {
      // Fetch role from user_roles table
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
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
            .insert({ user_id: userId, role: 'admin' });
          
          if (!insertError) {
            setRole('admin');
            return;
          }
        }
        
        setRole('cliente'); // Default role
        tagOneSignalUser('cliente', userId);
        return;
      }

      const userRole = (roleData?.role as UserRole) || 'cliente';
      setRole(userRole);
      tagOneSignalUser(userRole, userId);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole('cliente');
    } finally {
      setRoleLoading(false);
    }
  };

  const tagOneSignalUser = async (userRole: string, userId: string) => {
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        await OneSignal.login(userId);
        await OneSignal.User.addTags({ role: userRole });

        // If driver, tag their transport types
        if (userRole === 'motorista') {
          const { data: driverData } = await supabase
            .from('drivers')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (driverData) {
            const { data: vehicleTypes } = await supabase
              .from('driver_vehicle_types')
              .select('vehicle_type')
              .eq('driver_id', driverData.id);

            if (vehicleTypes) {
              const tags: Record<string, string> = {};
              vehicleTypes.forEach((vt) => {
                tags[`transport_${vt.vehicle_type}`] = 'true';
              });
              await OneSignal.User.addTags(tags);
            }
          }
        }
      });
    } catch (e) {
      console.error('OneSignal tagging error:', e);
    }
  };

  const refreshRole = async () => {
    if (user) {
      await fetchUserRole(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST (before checking session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (import.meta.env.DEV) console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);

          // Invalidate all queries so they refetch with new auth
          if (event === 'SIGNED_IN') {
            setTimeout(() => {
              queryClient.invalidateQueries();
            }, 100);
          }
        } else {
          setRole(null);
          setRoleLoading(false);
          // Clear all cached data on sign out
          if (event === 'SIGNED_OUT') {
            queryClient.clear();
          }
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setRoleLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, roleLoading, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
