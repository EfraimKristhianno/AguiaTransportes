import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Truck as TruckIcon,
  Building2,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import { OfflineBanner, UpdateBanner } from '@/components/PWABanners';
import logoAguia from '@/assets/logo-aguia.png';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/database';

// Define menu items with role access (Usuários é o último)
const allMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'gestor'] as UserRole[] },
  { icon: FileText, label: 'Solicitações', path: '/solicitacoes', roles: ['admin', 'gestor', 'motorista', 'cliente'] as UserRole[] },
  { icon: Building2, label: 'Clientes', path: '/clientes', roles: ['admin', 'gestor'] as UserRole[] },
  { icon: TruckIcon, label: 'Motoristas', path: '/motoristas', roles: ['admin', 'gestor'] as UserRole[] },
  { icon: Users, label: 'Usuários', path: '/usuarios', roles: ['admin'] as UserRole[] },
];

const getRoleLabel = (role: UserRole | null): string => {
  if (!role) return 'Usuário';
  const labels: Record<UserRole, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    motorista: 'Motorista',
    cliente: 'Cliente',
  };
  return labels[role] || 'Usuário';
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}

const DashboardLayout = ({ children, title, subtitle, icon }: DashboardLayoutProps) => {
  const { user, signOut, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => 
    role && item.roles.includes(role)
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const userName = user?.user_metadata?.full_name || 'Usuário';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-card p-2 shadow-md lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
        sidebarCollapsed ? "w-[72px]" : "w-64",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0"
      )}>
        {/* Collapse button - desktop only */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted lg:flex"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Close button - mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-4 top-4 lg:hidden"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-border",
          sidebarCollapsed ? "justify-center px-2" : "gap-3 px-4"
        )}>
          <div className={cn(
            "flex items-center justify-center rounded-lg bg-white p-1",
            sidebarCollapsed ? "h-10 w-10" : "h-12 w-24"
          )}>
            <img 
              src={logoAguia} 
              alt="Águia Transportes" 
              className="h-full w-full object-contain"
            />
          </div>
          {!sidebarCollapsed && (
            <p className="text-xs text-muted-foreground">{getRoleLabel(role)}</p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2 lg:p-3">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
                sidebarCollapsed && "justify-center px-2"
              )}
              activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className={cn(
          "border-t border-border",
          sidebarCollapsed ? "p-2" : "p-4"
        )}>
          <div className={cn(
            "mb-3 flex items-center",
            sidebarCollapsed ? "justify-center" : "gap-3"
          )}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
              {userInitial}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground">{getRoleLabel(role)}</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            className={cn(
              "w-full text-muted-foreground hover:text-destructive",
              sidebarCollapsed ? "justify-center px-0" : "justify-start"
            )}
            onClick={handleSignOut}
          >
            <LogOut className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
            {!sidebarCollapsed && <span>Sair</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className={cn(
        "flex-1 p-4 pt-16 transition-all duration-300 lg:p-8 lg:pt-8",
        sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
      )}>
        {/* Header */}
        <div className="mb-6 flex items-center gap-3 lg:mb-8">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground lg:text-2xl">{title}</h1>
            <p className="text-sm text-muted-foreground lg:text-base">{subtitle}</p>
          </div>
        </div>

        {children}
      </main>

      {/* PWA Banners */}
      <OfflineBanner />
      <UpdateBanner />
    </div>
  );
};

export default DashboardLayout;
