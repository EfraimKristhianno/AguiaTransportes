import { useState, useMemo, useCallback, useRef } from 'react';
import { LayoutDashboard, Package, Clock, Truck, CheckCircle2, Eye, TrendingUp, Loader2, Hash, MapPin, Pencil, Trash2, DollarSign } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DashboardLayout from '@/components/DashboardLayout';
import logoAguia from '@/assets/logo-aguia.png';
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
import { EditRequestDialog } from '@/components/solicitacoes/EditRequestDialog';
import { useRealtimeDeliveryRequests } from '@/hooks/useRealtimeDeliveryRequests';
import { RequestSearchBar, filterRequestsBySearch } from '@/components/shared/RequestSearchBar';
import { useAllFreightPrices, getFreightPricesForRequest, formatSingleFreightPrice } from '@/hooks/useFreightPrices';
import { detectRegionForFreight } from '@/lib/regionDetection';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
type DeliveryRequest = {
  id: string;
  request_number: number | null;
  status: string | null;
  scheduled_date: string | null;
  created_at: string | null;
  origin_address: string;
  destination_address: string;
  transport_type: string | null;
  client_id: string | null;
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
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();
  const isClient = role === 'cliente';
  const isDriver = role === 'motorista';
  useRealtimeDeliveryRequests();
  const { data: allFreightPrices = [] } = useAllFreightPrices();
  const canEditDelete = role === 'admin' || role === 'gestor' || role === 'cliente';
  const showPrices = role === 'admin' || role === 'gestor' || role === 'cliente';

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
          transport_type,
          client_id,
          region,
          requester,
          client:clients(name, phone, email),
          driver:drivers(name),
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

  const handleEdit = (item: any) => {
    setEditRequest(item);
    setEditOpen(true);
  };

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelRequestId, setCancelRequestId] = useState<string | null>(null);
  const [cancelRequestNumber, setCancelRequestNumber] = useState<string>('');
  const [cancelReason, setCancelReason] = useState('');

  const handleCancelRequest = async () => {
    if (!cancelRequestId || !cancelReason.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }
    try {
      const { error } = await supabase
        .from('delivery_requests')
        .update({ status: 'cancelada', notes: cancelReason.trim(), updated_at: new Date().toISOString() })
        .eq('id', cancelRequestId);
      if (error) throw error;
      toast.success('Solicitação cancelada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['deliveryRequests'] });
      queryClient.invalidateQueries({ queryKey: ['delivery_requests'] });
      setCancelDialogOpen(false);
      setCancelReason('');
      setCancelRequestId(null);
    } catch (error: any) {
      toast.error(`Erro ao cancelar: ${error.message}`);
    }
  };

  const openCancelDialog = (id: string, requestNumber: number | null) => {
    setCancelRequestId(id);
    setCancelRequestNumber(String(requestNumber || '').padStart(6, '0'));
    setCancelReason('');
    setCancelDialogOpen(true);
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
    return filterRequestsBySearch(deliveryRequests, searchQuery, statusFilter, dateFrom, dateTo);
  }, [deliveryRequests, searchQuery, statusFilter, dateFrom, dateTo]);

  // Calculate total freight value for admin/gestor
  const totalFreight = useMemo(() => {
    if (role !== 'admin' && role !== 'gestor') return 0;
    return filteredRequests.reduce((sum, item) => {
      const region = (item as any).region || detectRegionForFreight(item.destination_address);
      const prices = getFreightPricesForRequest(allFreightPrices, item.client_id, item.transport_type, region);
      if (prices.length > 0) {
        return sum + prices[0].price;
      }
      return sum;
    }, 0);
  }, [filteredRequests, allFreightPrices, role]);

  const handleDownloadPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo no canto superior direito
    try {
      const img = new Image();
      img.src = logoAguia;
      doc.addImage(img, 'PNG', pageWidth - 45, 6, 35, 18, undefined, 'FAST');
    } catch {}

    // Título e info à esquerda
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório do Dashboard', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateLabel = dateFrom || dateTo
      ? `Período: ${dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: ptBR }) : '...'} até ${dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: ptBR }) : '...'}`
      : 'Todas as datas';
    doc.text(dateLabel, 14, 23);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 29);

    // Indicadores resumo
    const totalRequests = filteredRequests.length;
    const totalFreightValue = filteredRequests.reduce((sum: number, item: any) => {
      const region = item.region || detectRegionForFreight(item.destination_address);
      const prices = getFreightPricesForRequest(allFreightPrices, item.client_id, item.transport_type, region);
      if (prices.length > 0) return sum + prices[0].price;
      return sum;
    }, 0);
    const statusCounts: Record<string, number> = {};
    filteredRequests.forEach((r: any) => {
      const s = r.status || 'solicitada';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    autoTable(doc, {
      startY: 35,
      head: [['Total Solicitações', 'Valor Total Frete', ...Object.keys(statusCounts).map(s => s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' '))]],
      body: [[
        totalRequests.toString(),
        `R$ ${totalFreightValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        ...Object.values(statusCounts).map(v => v.toString()),
      ]],
      theme: 'grid',
      headStyles: { fillColor: [211, 33, 39], fontSize: 8 },
      bodyStyles: { fontSize: 8, fontStyle: 'bold' },
      margin: { left: 14 },
    });

    let y = (doc as any).lastAutoTable.finalY + 8;

    // Tabela detalhada
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhamento', 14, y);
    y += 3;

    const getFreightValue = (item: any): string => {
      const region = item.region || detectRegionForFreight(item.destination_address);
      const prices = getFreightPricesForRequest(allFreightPrices, item.client_id, item.transport_type, region);
      return formatSingleFreightPrice(prices);
    };

    const formatDateTimePdf = (dateString: string | null) => {
      if (!dateString) return '-';
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    };

    const tableData = filteredRequests.map(item => [
      formatDateTimePdf(item.created_at),
      String((item as any).request_number || '-'),
      (item as any).client?.name || '-',
      (item as any).driver?.name || '-',
      item.transport_type || '-',
      item.origin_address || '-',
      item.destination_address || '-',
      (item as any).requester || '-',
      getFreightValue(item),
    ]);

    autoTable(doc, {
      head: [['Data/Hora', 'ID', 'Cliente', 'Motorista', 'Tipo Transporte', 'End. Coleta', 'End. Entrega', 'Solicitante', 'Valor Frete']],
      body: tableData,
      startY: y,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [211, 33, 39], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        5: { cellWidth: 45 },
        6: { cellWidth: 45 },
      },
      margin: { left: 14 },
    });

    doc.save(`dashboard-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }, [filteredRequests, dateFrom, dateTo, allFreightPrices]);
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
      },
      cancelada: {
        label: 'Cancelada',
        className: 'bg-red-50 text-red-700 border-red-200',
        icon: <Trash2 className="h-3 w-3 mr-1" />
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
      <div className={`mb-4 sm:mb-6 grid gap-3 grid-cols-2 lg:gap-4 ${(role === 'admin' || role === 'gestor') ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
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

        {/* Total Fretes - apenas admin/gestor */}
        {(role === 'admin' || role === 'gestor') && (
          <Card className="border-border col-span-2 lg:col-span-1">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Fretes</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {totalFreight.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search and Filter */}
      <div className="mb-4 sm:mb-6">
        <RequestSearchBar
          searchTerm={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          
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
                    <TableCell>{item.vehicle?.type || item.transport_type || '-'}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{formatDate(item.scheduled_date || item.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(item.id)} title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEditDelete && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                              title={isClient && (item.status === 'entregue' || item.status === 'cancelada') ? 'Não é possível editar' : 'Editar'}
                              disabled={isClient && (item.status === 'entregue' || item.status === 'cancelada')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={item.status === 'entregue' || item.status === 'cancelada' ? 'Não é possível cancelar' : 'Cancelar'}
                              disabled={item.status === 'entregue' || item.status === 'cancelada'}
                              onClick={() => openCancelDialog(item.id, item.request_number)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>

          {/* Cards - Mobile */}
          <div className="space-y-3 lg:hidden">
            {filteredRequests.map(item => <div key={item.id} className="rounded-xl border border-border bg-card p-3 sm:p-4 shadow-[var(--shadow-soft)] active:bg-muted/50 transition-colors">
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
                    <p className="font-medium">{item.vehicle?.type || item.transport_type || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-medium">{formatDate(item.scheduled_date || item.created_at)}</p>
                  </div>
                   <div className="flex items-end justify-end gap-0.5">
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => handleViewDetails(item.id)}>
                      <Eye className="h-5 w-5" />
                    </Button>
                    {canEditDelete && (
                      <>
                        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => handleEdit(item)}>
                          <Pencil className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          disabled={item.status === 'entregue' || item.status === 'cancelada'}
                          onClick={() => openCancelDialog(item.id, item.request_number)}
                        >
                          <Trash2 className="h-5 w-5 text-destructive" />
                        </Button>
                      </>
                    )}
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

      <EditRequestDialog
        request={editRequest}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditRequest(null);
        }}
      />

      <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => { setCancelDialogOpen(open); if (!open) setCancelReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar solicitação #{cancelRequestNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta solicitação será marcada como cancelada. Informe o motivo abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason">Motivo do cancelamento *</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Descreva o motivo do cancelamento..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRequest}
              disabled={!cancelReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>;
};
export default Dashboard;