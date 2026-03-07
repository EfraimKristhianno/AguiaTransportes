import { useState } from 'react';
import { Clock, Package, Hash, MapPin, User, Phone, DollarSign, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDeliveryRequests } from '@/hooks/useDeliveryRequests';
import { UnifiedRequestDetailsDialog } from '@/components/shared/UnifiedRequestDetailsDialog';
import { useCurrentDriver } from '@/hooks/useDriverRequests';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { filterRequestsBySearch } from '@/components/shared/RequestSearchBar';
import { cn } from '@/lib/utils';
import { useAllFreightPrices, getFreightPricesForRequest, formatSingleFreightPrice } from '@/hooks/useFreightPrices';
import { resolveFreightRegion } from '@/lib/regionDetection';
import { DriverTrackingDialog } from '@/components/motoristas/DriverTrackingDialog';
const getStatusBadgeVariant = (status: string | null) => {
  switch (status) {
    case 'solicitada':
      return 'outline';
    case 'aceita':
      return 'secondary';
    case 'pendente_coleta':
      return 'secondary';
    case 'coletada':
      return 'default';
    case 'em_rota':
      return 'default';
    case 'pendente_entrega':
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
    case 'pendente_coleta':
      return 'Coleta Pendente';
    case 'coletada':
      return 'Coletada';
    case 'em_rota':
      return 'Em Trânsito';
    case 'pendente_entrega':
      return 'Entrega Pendente';
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
    case 'pendente_coleta':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 'coletada':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'em_rota':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'pendente_entrega':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'entregue':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
};
interface RequestListProps {
  searchTerm?: string;
  statusFilter?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export const RequestList = ({ searchTerm = '', statusFilter = 'all', dateFrom, dateTo }: RequestListProps) => {
  const {
    role
  } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [trackingRequest, setTrackingRequest] = useState<any>(null);
  const {
    data: currentDriver
  } = useCurrentDriver();
  const driverId = role === 'motorista' ? currentDriver?.id : null;
  const {
    data: requests = [],
    isLoading
  } = useDeliveryRequests();
  const { data: allFreightPrices = [] } = useAllFreightPrices();
  const showFreightValue = role === 'admin' || role === 'gestor';
  const filteredRequests = filterRequestsBySearch(requests, searchTerm, statusFilter, dateFrom, dateTo);
  return <div className="bg-card rounded-lg border h-full flex flex-col shadow-[var(--shadow-card)] overflow-hidden">
      {/* Request List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? <div className="text-center text-muted-foreground py-8">
              Carregando solicitações...
            </div> : filteredRequests.length === 0 ? <div className="text-center text-muted-foreground py-8">
              Nenhuma solicitação encontrada
             </div> : filteredRequests.map(request => <div key={request.id} onClick={() => setSelectedRequest(request)} className="bg-background rounded-lg border p-3 sm:p-4 hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/30">
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-mono font-bold text-primary">
                      #{String(request.request_number || '').padStart(6, '0')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={getStatusBadgeVariant(request.status)} className={cn("text-xs", getStatusClassName(request.status))}>
                      {getStatusLabel(request.status)}
                    </Badge>
                    {request.scheduled_date && request.status !== 'agendada' && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Agendada
                      </Badge>
                    )}
                    {request.status === 'agendada' && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Agendada
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium break-words">
                    {request.clients?.name || 'Cliente não especificado'}
                  </span>
                  {request.clients?.phone && <>
                      <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {request.clients.phone}
                      </span>
                    </>}
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-sm break-words">
                    {request.material_types?.name || 'Material não especificado'}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground break-words">
                    {request.transport_type || 'Transporte não especificado'}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{request.origin_address}</p>
                    <p className="break-words">→ {request.destination_address}</p>
                  </div>
                </div>

                {showFreightValue && (() => {
                  const region = resolveFreightRegion(request.origin_address, request.destination_address);
                  const prices = getFreightPricesForRequest(allFreightPrices, request.client_id, request.transport_type, region);
                  const priceText = formatSingleFreightPrice(prices, region);
                  return priceText !== '-' ? (
                    <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-emerald-700">
                      <DollarSign className="h-3 w-3 shrink-0" />
                      <span>Frete: {priceText}</span>
                    </div>
                  ) : null;
                })()}

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    {request.created_at ? format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR
              }) : 'Data não disponível'}
                  </div>
                  {request.driver_id && ['aceita', 'pendente_coleta', 'coletada', 'em_rota', 'pendente_entrega'].includes(request.status || '') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTrackingRequest(request);
                      }}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                      title="Rastrear motorista"
                    >
                      <Navigation className="h-4 w-4" />
                      <span className="hidden sm:inline">Rastrear</span>
                    </button>
                  )}
                </div>
              </div>)}
        </div>
      </ScrollArea>

      <UnifiedRequestDetailsDialog request={selectedRequest} open={!!selectedRequest} onOpenChange={open => {
      if (!open) setSelectedRequest(null);
    }} driverId={driverId} />

      {trackingRequest && (
        <DriverTrackingDialog
          open={!!trackingRequest}
          onOpenChange={(open) => { if (!open) setTrackingRequest(null); }}
          driverId={trackingRequest.driver_id}
          driverName={trackingRequest.drivers?.name || 'Motorista'}
          requestNumber={trackingRequest.request_number}
          originAddress={trackingRequest.origin_address}
          destinationAddress={trackingRequest.destination_address}
          status={trackingRequest.status}
        />
      )}
    </div>;
};