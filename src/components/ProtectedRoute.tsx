import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

// Define route permissions
const routePermissions: Record<string, UserRole[]> = {
  '/dashboard': ['admin', 'gestor', 'cliente', 'motorista'],
  '/solicitacoes': ['admin', 'gestor', 'motorista', 'cliente'],
  '/usuarios': ['admin', 'gestor'],
  '/motoristas': ['admin', 'gestor', 'motorista'],
  '/veiculos': ['admin', 'gestor', 'motorista'],
  '/clientes': ['admin', 'gestor'],
};

const getDefaultRoute = (role: UserRole | null): string => {
  if (!role) return '/';
  
  const defaultRoutes: Record<UserRole, string> = {
    admin: '/dashboard',
    gestor: '/dashboard',
    assistente_logistico: '/dashboard',
    motorista: '/dashboard',
    cliente: '/dashboard',
  };

  return defaultRoutes[role] || '/solicitacoes';
};

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading, role, roleLoading } = useAuth();
  const location = useLocation();

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Check route-based permissions
  const currentPath = location.pathname;
  const requiredRoles = allowedRoles || routePermissions[currentPath];

  if (requiredRoles && role && !requiredRoles.includes(role)) {
    // Redirect to the default route for this role
    return <Navigate to={getDefaultRoute(role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
