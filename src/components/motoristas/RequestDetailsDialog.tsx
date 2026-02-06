import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Phone, 
  User, 
  Package, 
  Truck, 
  Calendar, 
  FileText,
  Navigation,
  Loader2,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DriverRequest, useAcceptDeliveryRequest } from '@/hooks/useDriverRequests';

interface RequestDetailsDialogProps {
  request: DriverRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
}

// Simple distance estimation (placeholder - in production would use a geocoding API)
const estimateDistance = (origin: string, destination: string): string => {
  // This is a placeholder. In a real app, you would use Google Maps Distance Matrix API
  // or similar service to calculate actual distance
  const randomDistance = Math.floor(Math.random() * 50) + 5;
  return `~${randomDistance} km`;
};

export const RequestDetailsDialog = ({
  request,
  open,
  onOpenChange,
  driverId,
}: RequestDetailsDialogProps) => {
  const acceptMutation = useAcceptDeliveryRequest();
  const [isAccepting, setIsAccepting] = useState(false);

  if (!request) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const estimatedDistance = estimateDistance(request.origin_address, request.destination_address);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await acceptMutation.mutateAsync({ requestId: request.id, driverId });
      onOpenChange(false);
    } finally {
      setIsAccepting(false);
    }
  };

  const canAccept = request.status === 'solicitada' || request.status === 'enviada';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            <span className="font-mono font-bold text-primary">
              #{String(request.request_number || '').padStart(6, '0')}
            </span>
            <Badge 
              variant="outline" 
              className="bg-amber-50 text-amber-700 border-amber-200 ml-2"
            >
              {request.status === 'enviada' ? 'Solicitada' : request.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Client Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente
            </h4>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="font-medium">{request.clients?.name || 'Não informado'}</p>
              {request.clients?.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {request.clients.phone}
                </p>
              )}
            </div>
          </div>

          {/* Material and Transport */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Material
              </h4>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{request.material_types?.name || '-'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Transporte
              </h4>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{request.transport_type || '-'}</p>
              </div>
            </div>
          </div>

          {/* Requester and Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Solicitante</h4>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{request.requester || '-'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data
              </h4>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-sm">{formatDate(request.scheduled_date || request.created_at)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Addresses */}
          <div className="space-y-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                Endereço de Coleta
              </h4>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="font-medium text-green-800">{request.origin_address}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-600" />
                Endereço de Entrega
              </h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="font-medium text-red-800">{request.destination_address}</p>
              </div>
            </div>
          </div>

          {/* Distance Estimate */}
          <div className="bg-primary/10 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Distância Estimada</span>
            </div>
            <span className="text-lg font-bold text-primary">{estimatedDistance}</span>
          </div>

          {/* Notes */}
          {request.notes && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Observações
              </h4>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm">{request.notes}</p>
              </div>
            </div>
          )}

          {/* Accept Button */}
          {canAccept && (
            <Button 
              onClick={handleAccept} 
              className="w-full"
              disabled={isAccepting}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aceitando...
                </>
              ) : (
                'Aceitar Coleta'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
