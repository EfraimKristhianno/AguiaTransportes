import { 
  LayoutDashboard,
  Package,
  Clock,
  Truck as TruckIcon,
  CheckCircle,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useState } from 'react';
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
import { Button } from '@/components/ui/button';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

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
    <DashboardLayout 
      title="Dashboard Admin" 
      subtitle="Visão geral do sistema de logística"
      icon={<LayoutDashboard className="h-5 w-5" />}
    >
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
    </DashboardLayout>
  );
};

export default Dashboard;
