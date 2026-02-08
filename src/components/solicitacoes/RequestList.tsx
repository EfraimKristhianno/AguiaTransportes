import { useState } from 'react';
import { Search, Filter, Clock, Package, Hash, MapPin, User, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDeliveryRequests } from '@/hooks/useDeliveryRequests';
import { UnifiedRequestDetailsDialog } from '@/components/shared/UnifiedRequestDetailsDialog';
import { useCurrentDriver } from '@/hooks/useDriverRequests';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
const STATUS_OPTIONS = [{
  value: 'all',
  label: 'Todos'
}, {
  value: 'solicitada',
  label: 'Solicitada'
}, {
  value: 'aceita',
  label: 'Aceita'
}, {
  value: 'coletada',
  label: 'Coletada'
}, {
  value: 'em_rota',
  label: 'Em Trânsito'
}, {
  value: 'entregue',
  label: 'Entregue'
}];
const getStatusBadgeVariant = (status: string | null) => {
  switch (status) {
    case 'solicitada':
      return 'outline';
    case 'aceita':
      return 'secondary';
    case 'coletada':
      return 'default';
    case 'em_rota':
      return 'default';
    case 'entregue':
      return 'default';
    default:
      return 'outline';
  }
};
const getStatusLabel = (status: string | null) => {
  switch (status) {
    case 'solicitada':
      return 'Solicitada';
    case 'aceita':
      return 'Aceita';
    case 'coletada':
      return 'Coletada';
    case 'em_rota':
      return 'Em Trânsito';
    case 'entregue':
      return 'Entregue';
    // Legacy status support
    case 'enviada':
      return 'Solicitada';
    default:
      return status || 'Solicitada';
  }
};
const getStatusClassName = (status: string | null) => {
  switch (status) {
    case 'solicitada':
    case 'enviada':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'aceita':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'coletada':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'em_rota':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'entregue':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
};
export const RequestList = () => {
  const {
    role
  } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const {
    data: currentDriver
  } = useCurrentDriver();
  const driverId = role === 'motorista' ? currentDriver?.id : null;
  const {
    data: requests = [],
    isLoading
  } = useDeliveryRequests(statusFilter === 'all' ? null : statusFilter);
  const filteredRequests = requests.filter(request => {
    const materialName = request.material_types?.name?.toLowerCase() || '';
    const clientName = request.clients?.name?.toLowerCase() || '';
    const requestNumber = String(request.request_number || '');
    const invoiceNumber = (request.invoice_number || '').toLowerCase();
    const opNumber = (request.op_number || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return materialName.includes(search) || clientName.includes(search) || requestNumber.includes(search) || invoiceNumber.includes(search) || opNumber.includes(search);
  });
  return <div className="bg-card rounded-lg border h-full flex flex-col shadow-[var(--shadow-card)]">
      {/* Header with search and filter */}
      <div className="p-4 border-b flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por ID, cliente, material, NF ou O.P..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Request List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? <div className="text-center text-muted-foreground py-8">
              Carregando solicitações...
            </div> : filteredRequests.length === 0 ? <div className="text-center text-muted-foreground py-8">
              Nenhuma solicitação encontrada
            </div> : filteredRequests.map(request => <div key={request.id} onClick={() => setSelectedRequest(request)} className="bg-background rounded-lg border p-4 hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/30 mr-0 px-[8px] py-[12px] my-[15px] mx-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    <span className="font-mono font-bold text-primary">
                      #{String(request.request_number || '').padStart(6, '0')}
                    </span>
                  </div>
                  <Badge variant={getStatusBadgeVariant(request.status)} className={getStatusClassName(request.status)}>
                    {getStatusLabel(request.status)}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {request.clients?.name || 'Cliente não especificado'}
                  </span>
                  {request.clients?.phone && <>
                      <Phone className="h-3 w-3 text-muted-foreground ml-2" />
                      <span className="text-xs text-muted-foreground">
                        {request.clients.phone}
                      </span>
                    </>}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">
                    {request.material_types?.name || 'Material não especificado'}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {request.transport_type || 'Transporte não especificado'}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 mt-0.5" />
                  <div className="flex-1">
                    <p className="truncate">{request.origin_address}</p>
                    <p className="truncate">→ {request.destination_address}</p>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {request.created_at ? format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR
            }) : 'Data não disponível'}
                </div>
              </div>)}
        </div>
      </ScrollArea>

      <UnifiedRequestDetailsDialog request={selectedRequest} open={!!selectedRequest} onOpenChange={open => {
      if (!open) setSelectedRequest(null);
    }} driverId={driverId} />
    </div>;
};