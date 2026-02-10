import { useState, useMemo } from 'react';
import { LayoutDashboard, Package, Clock, Truck, CheckCircle2, Eye, TrendingUp, Loader2, Hash, MapPin } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, startOfYesterday, endOfYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentDriver } from '@/hooks/useDriverRequests';
import { UnifiedRequestDetailsDialog } from '@/components/shared/UnifiedRequestDetailsDialog';
import { RequestSearchBar, filterRequestsBySearch } from '@/components/shared/RequestSearchBar';
type DeliveryRequest = {
  id: string;
  request_number: number | null;
  status: string | null;
  scheduled_date: string | null;
  created_at: string | null;
  origin_address: string;
  destination_address: string;
  client: {
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  material_type: {
    name: string;
  } | null;
  vehicle: {
    type: string;
  } | null;
};
const Dashboard = () => {
  const {
    user,
    role
  } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isClient = role === 'cliente';
  const isDriver = role === 'motorista';

  // Get current driver record for driver users
  const {
    data: currentDriver
  } = useCurrentDriver();
  // Fetch client record for client users
  const {
    data: clientRecord
  } = useQuery({
    queryKey: ['clientRecord', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const {
        data,
        error
      } = await supabase.from('clients').select('id').eq('email', user.email).maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.email && isClient
  });

  // Fetch delivery requests with relations
  const {
    data: deliveryRequests = [],
    isLoading
  } = useQuery({
    queryKey: ['deliveryRequests', isClient, isDriver, clientRecord?.id, currentDriver?.id],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      let query = supabase.from('delivery_requests').select(`
          id,
          request_number,
          status,
          scheduled_date,
          created_at,
          origin_address,
          destination_address,
          driver_id,
          invoice_number,
          op_number,
          client:clients(name, phone, email),
          material_type:material_types(name),
          vehicle:vehicles(type)
        `).order('created_at', {
        ascending: false
      });

      // Filter by client_id if user is a client
      if (isClient && clientRecord?.id) {
        query = query.eq('client_id', clientRecord.id);
      }

      // Filter by driver_id if user is a driver
      if (isDriver && currentDriver?.id) {
        query = query.eq('driver_id', currentDriver.id);
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      return data as (DeliveryRequest & {
        driver_id: string | null;
      })[];
    },
    enabled: (!isClient || !!clientRecord?.id) && (!isDriver || !!currentDriver?.id)
  });

  // Fetch full details for selected request
  const { data: selectedRequest } = useQuery({
    queryKey: ['deliveryRequestDetail', selectedRequestId],
    enabled: !!selectedRequestId,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_requests')
        .select(`*, clients:client_id(name, phone, email), material_types:material_type_id(name), drivers:driver_id(name)`)
        .eq('id', selectedRequestId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleViewDetails = (id: string) => {
    setSelectedRequestId(id);
    setDetailsOpen(true);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = deliveryRequests.length;
    const today = deliveryRequests.filter(r => r.created_at && isToday(new Date(r.created_at))).length;
    const inProgress = deliveryRequests.filter(r => r.status === 'solicitada' || r.status === 'aceita' || r.status === 'coletada' || r.status === 'em_rota' || r.status === 'enviada').length;
    const delivered = deliveryRequests.filter(r => r.status === 'entregue').length;

    // Calculate yesterday's total for comparison
    const yesterdayStart = startOfYesterday();
    const yesterdayEnd = endOfYesterday();
    const yesterdayTotal = deliveryRequests.filter(r => {
      if (!r.created_at) return false;
      const date = new Date(r.created_at);
      return date >= yesterdayStart && date <= yesterdayEnd;
    }).length;
    const percentChange = yesterdayTotal > 0 ? Math.round((today - yesterdayTotal) / yesterdayTotal * 100) : today > 0 ? 100 : 0;
    return {
      total,
      today,
      inProgress,
      delivered,
      percentChange
    };
  }, [deliveryRequests]);

  // Filter delivery requests
  const filteredRequests = useMemo(() => {
    return filterRequestsBySearch(deliveryRequests, searchQuery, statusFilter);
  }, [deliveryRequests, searchQuery, statusFilter]);
  const getStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, {
      label: string;
      className: string;
      icon: React.ReactNode;
    }> = {
      solicitada: {
        label: 'Solicitada',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <Clock className="h-3 w-3 mr-1" />
      },
      enviada: {
        label: 'Solicitada',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <Clock className="h-3 w-3 mr-1" />
      },
      aceita: {
        label: 'Aceita',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />
      },
      coletada: {
        label: 'Coletada',
        className: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: <Package className="h-3 w-3 mr-1" />
      },
      em_rota: {
        label: 'Em Trânsito',
        className: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: <Truck className="h-3 w-3 mr-1" />
      },
      entregue: {
        label: 'Entregue',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />
      }
    };
    const config = statusConfig[status || 'solicitada'] || statusConfig.solicitada;
    return <Badge variant="outline" className={`${config.className} flex items-center w-fit`}>
        {config.icon}
        {config.label}
      </Badge>;
  };
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', {
      locale: ptBR
    });
  };
  const dashboardTitle = isClient ? 'Minhas Solicitações' : isDriver ? 'Minhas Entregas' : 'Dashboard Admin';
  const dashboardSubtitle = isClient ? 'Acompanhe suas solicitações de coleta' : isDriver ? 'Acompanhe suas entregas aceitas' : 'Visão geral do sistema de logística';
  return <DashboardLayout title={dashboardTitle} subtitle={dashboardSubtitle} icon={<LayoutDashboard className="h-5 w-5" />}>
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
              {stats.percentChange !== 0 && <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className={`h-3 w-3 ${stats.percentChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                  <span className={`text-xs ${stats.percentChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {stats.percentChange >= 0 ? '+' : ''}{stats.percentChange}% vs ontem
                  </span>
                </div>}
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
      <div className="mb-6">
        <RequestSearchBar
          searchTerm={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
        />
      </div>

      {/* Table */}
      {isLoading ? <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div> : filteredRequests.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-center shadow-xl">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchQuery || statusFilter !== 'all' ? 'Nenhuma solicitação encontrada com os filtros aplicados' : 'Nenhuma solicitação cadastrada'}
          </p>
        </div> : <>
          {/* Table - Desktop */}
          <div className="hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Transporte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map(item => <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-mono font-bold text-primary">
                        #{String(item.request_number || '').padStart(6, '0')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-foreground">
                          {item.client?.name || 'Cliente não informado'}
                        </span>
                        {item.client?.phone && <p className="text-sm text-muted-foreground">{item.client.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{item.material_type?.name || '-'}</TableCell>
                    <TableCell>{item.vehicle?.type || '-'}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{formatDate(item.scheduled_date || item.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(item.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>

          {/* Cards - Mobile */}
          <div className="space-y-3 lg:hidden">
            {filteredRequests.map(item => <div key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-primary">
                    #{String(item.request_number || '').padStart(6, '0')}
                  </span>
                  {getStatusBadge(item.status)}
                </div>
                <div className="mb-2">
                  <span className="font-medium text-foreground">
                    {item.client?.name || 'Cliente não informado'}
                  </span>
                  {item.client?.phone && <p className="text-sm text-muted-foreground">{item.client.phone}</p>}
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
                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(item.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>)}
          </div>
        </>}

      <UnifiedRequestDetailsDialog
        request={selectedRequest as any || null}
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedRequestId(null);
        }}
        driverId={currentDriver?.id}
      />
    </DashboardLayout>;
};
export default Dashboard;