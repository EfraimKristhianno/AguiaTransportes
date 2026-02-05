import { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Clock, 
  Truck, 
  CheckCircle2,
  Search,
  Filter,
  Eye,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, startOfYesterday, endOfYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type DeliveryRequest = {
  id: string;
  status: string | null;
  scheduled_date: string | null;
  created_at: string | null;
  origin_address: string;
  destination_address: string;
  client: { name: string; phone: string | null } | null;
  material_type: { name: string } | null;
  vehicle: { type: string } | null;
};

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Fetch delivery requests with relations
  const { data: deliveryRequests = [], isLoading } = useQuery({
    queryKey: ['deliveryRequests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_requests')
        .select(`
          id,
          status,
          scheduled_date,
          created_at,
          origin_address,
          destination_address,
          client:clients(name, phone),
          material_type:material_types(name),
          vehicle:vehicles(type)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DeliveryRequest[];
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    const total = deliveryRequests.length;
    const today = deliveryRequests.filter(
      (r) => r.created_at && isToday(new Date(r.created_at))
    ).length;
    const inProgress = deliveryRequests.filter(
      (r) => r.status === 'pending' || r.status === 'in_transit'
    ).length;
    const delivered = deliveryRequests.filter(
      (r) => r.status === 'delivered'
    ).length;
    
    // Calculate yesterday's total for comparison
    const yesterdayStart = startOfYesterday();
    const yesterdayEnd = endOfYesterday();
    const yesterdayTotal = deliveryRequests.filter((r) => {
      if (!r.created_at) return false;
      const date = new Date(r.created_at);
      return date >= yesterdayStart && date <= yesterdayEnd;
    }).length;
    
    const percentChange = yesterdayTotal > 0 
      ? Math.round(((today - yesterdayTotal) / yesterdayTotal) * 100)
      : today > 0 ? 100 : 0;

    return { total, today, inProgress, delivered, percentChange };
  }, [deliveryRequests]);

  // Filter delivery requests
  const filteredRequests = useMemo(() => {
    return deliveryRequests.filter((item) => {
      const matchesSearch =
        item.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.material_type?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'todos' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [deliveryRequests, searchQuery, statusFilter]);

  const getStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      pending: {
        label: 'Pendente',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
      in_transit: {
        label: 'Enviado',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: <Truck className="h-3 w-3 mr-1" />,
      },
      delivered: {
        label: 'Entregue',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
      },
    };
    const config = statusConfig[status || 'pending'] || statusConfig.pending;
    return (
      <Badge variant="outline" className={`${config.className} flex items-center w-fit`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <DashboardLayout 
      title="Dashboard Admin" 
      subtitle="Visão geral do sistema de logística"
      icon={<LayoutDashboard className="h-5 w-5" />}
    >
      {/* Stats Cards */}
      <div className="mb-6 grid gap-3 grid-cols-2 lg:gap-4 lg:grid-cols-4">
        {/* Total Solicitações */}
        <Card className="border-border">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total de</p>
              <p className="text-sm text-muted-foreground">Solicitações</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <Package className="h-6 w-6 text-rose-500" />
            </div>
          </CardContent>
        </Card>

        {/* Hoje */}
        <Card className="border-border">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Hoje</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.today}</p>
              {stats.percentChange !== 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className={`h-3 w-3 ${stats.percentChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                  <span className={`text-xs ${stats.percentChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {stats.percentChange >= 0 ? '+' : ''}{stats.percentChange}% vs ontem
                  </span>
                </div>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <Clock className="h-6 w-6 text-rose-500" />
            </div>
          </CardContent>
        </Card>

        {/* Em Andamento */}
        <Card className="border-border">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Em Andamento</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.inProgress}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Truck className="h-6 w-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        {/* Entregues */}
        <Card className="border-border">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Entregues</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.delivered}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_transit">Enviado</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchQuery || statusFilter !== 'todos'
              ? 'Nenhuma solicitação encontrada com os filtros aplicados'
              : 'Nenhuma solicitação cadastrada'}
          </p>
        </div>
      ) : (
        <>
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
                {filteredRequests.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium text-foreground">
                          {item.client?.name || 'Cliente não informado'}
                        </span>
                        {item.client?.phone && (
                          <p className="text-sm text-muted-foreground">{item.client.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.material_type?.name || '-'}</TableCell>
                    <TableCell>{item.vehicle?.type || '-'}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{formatDate(item.scheduled_date || item.created_at)}</TableCell>
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
            {filteredRequests.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-foreground">
                      {item.client?.name || 'Cliente não informado'}
                    </span>
                    {item.client?.phone && (
                      <p className="text-sm text-muted-foreground">{item.client.phone}</p>
                    )}
                  </div>
                  {getStatusBadge(item.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Material</p>
                    <p className="font-medium">{item.material_type?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Transporte</p>
                    <p className="font-medium">{item.vehicle?.type || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-medium">{formatDate(item.scheduled_date || item.created_at)}</p>
                  </div>
                  <div className="flex items-end justify-end">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
