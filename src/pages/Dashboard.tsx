import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Truck as TruckIcon,
  LogOut,
  Package,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Eye,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { OfflineBanner, UpdateBanner } from '@/components/PWABanners';
import logoAguia from '@/assets/logo-aguia.png';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: FileText, label: 'Solicitações', active: false },
  { icon: Users, label: 'Usuários', active: false },
  { icon: TruckIcon, label: 'Motoristas', active: false },
];

// Mock data for demonstration
const mockDeliveries = [
  { 
    id: 1, 
    cliente: 'Mike', 
    telefone: '41937837673', 
    material: 'Outros', 
    transporte: 'Moto', 
    status: 'Entregue', 
    data: '30/01/2026' 
  },
  { 
    id: 2, 
    cliente: 'Douglas', 
    telefone: '41985308489', 
    material: 'Alimentos', 
    transporte: 'Carro', 
    status: 'Entregue', 
    data: '29/01/2026' 
  },
  { 
    id: 3, 
    cliente: 'Pedro', 
    telefone: '41985642578', 
    material: 'Medicamentos', 
    transporte: 'Van', 
    status: 'Enviado', 
    data: '29/01/2026' 
  },
];

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const userName = user?.user_metadata?.full_name || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();

  const getStatusBadge = (status: string) => {
    const styles = {
      'Entregue': 'bg-green-50 text-green-700 border-green-200',
      'Enviado': 'bg-blue-50 text-blue-700 border-blue-200',
      'Pendente': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Cancelado': 'bg-red-50 text-red-700 border-red-200',
    };
    return styles[status as keyof typeof styles] || 'bg-muted text-muted-foreground';
  };

  const filteredDeliveries = mockDeliveries.filter(delivery => {
    const matchesSearch = delivery.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         delivery.material.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || delivery.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

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
      <aside className={`
        fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-card
        transition-transform duration-300 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Close button - mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-4 top-4 lg:hidden"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-white p-1">
            <img 
              src={logoAguia} 
              alt="Águia Transportes" 
              className="h-full w-full object-contain"
            />
          </div>
          <p className="text-xs text-muted-foreground">Admin</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => setSidebarOpen(false)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
              {userInitial}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 pt-16 lg:ml-64 lg:p-8 lg:pt-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-xl font-bold text-foreground lg:text-2xl">Dashboard Admin</h1>
          <p className="text-sm text-muted-foreground lg:text-base">Visão geral do sistema de logística</p>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-3 grid-cols-2 lg:mb-8 lg:gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground lg:text-sm">Total</p>
                <p className="mt-1 text-2xl font-bold text-foreground lg:text-3xl">4</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 lg:p-3">
                <Package className="h-5 w-5 text-primary lg:h-6 lg:w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground lg:text-sm">Hoje</p>
                <p className="mt-1 text-2xl font-bold text-foreground lg:text-3xl">0</p>
                <p className="mt-1 text-xs text-green-600">↗ +12%</p>
              </div>
              <div className="rounded-lg bg-orange-100 p-2 lg:p-3">
                <Clock className="h-5 w-5 text-orange-600 lg:h-6 lg:w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground lg:text-sm">Em Andamento</p>
                <p className="mt-1 text-2xl font-bold text-foreground lg:text-3xl">2</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 lg:p-3">
                <TruckIcon className="h-5 w-5 text-primary lg:h-6 lg:w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground lg:text-sm">Entregues</p>
                <p className="mt-1 text-2xl font-bold text-foreground lg:text-3xl">2</p>
              </div>
              <div className="rounded-lg bg-green-100 p-2 lg:p-3">
                <CheckCircle className="h-5 w-5 text-green-600 lg:h-6 lg:w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-4 flex flex-col gap-3 lg:mb-6 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table - Desktop */}
        <div className="hidden rounded-xl border border-border bg-card lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Transporte</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{delivery.cliente}</p>
                      <p className="text-sm text-muted-foreground">{delivery.telefone}</p>
                    </div>
                  </TableCell>
                  <TableCell>{delivery.material}</TableCell>
                  <TableCell>{delivery.transporte}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getStatusBadge(delivery.status)}
                    >
                      {delivery.status === 'Entregue' && <CheckCircle className="mr-1 h-3 w-3" />}
                      {delivery.status === 'Enviado' && <TruckIcon className="mr-1 h-3 w-3" />}
                      {delivery.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{delivery.data}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Cards - Mobile */}
        <div className="space-y-3 lg:hidden">
          {filteredDeliveries.map((delivery) => (
            <div key={delivery.id} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{delivery.cliente}</p>
                  <p className="text-sm text-muted-foreground">{delivery.telefone}</p>
                </div>
                <Badge 
                  variant="outline" 
                  className={getStatusBadge(delivery.status)}
                >
                  {delivery.status}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Material</p>
                  <p className="font-medium">{delivery.material}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Transporte</p>
                  <p className="font-medium">{delivery.transporte}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">{delivery.data}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* PWA Banners */}
      <OfflineBanner />
      <UpdateBanner />
    </div>
  );
};

export default Dashboard;
