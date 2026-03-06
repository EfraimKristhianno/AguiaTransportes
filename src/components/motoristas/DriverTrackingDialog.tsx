import { useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Clock, Truck } from 'lucide-react';
import { useDriverLocation } from '@/hooks/useDriverLocation';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DriverTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
  driverName: string;
  requestNumber?: number;
  originAddress?: string;
  destinationAddress?: string;
  status?: string;
}

// Vehicle icon SVG as data URI
const vehicleIconUrl = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="11" fill="#3b82f6" stroke="#2563eb" stroke-width="1"/>
  <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" fill="white"/>
  <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" fill="white"/>
  <path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2" fill="none" stroke="white"/>
  <path d="M10 17h4" stroke="white"/>
  <path d="M6 6l4 0l0 4l-6 0" stroke="white" fill="none"/>
</svg>`)}`;

const vehicleIcon = new L.Icon({
  iconUrl: vehicleIconUrl,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const originIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#22c55e"/><circle cx="15" cy="15" r="7" fill="white"/></svg>`)}`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});

const destinationIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#ef4444"/><circle cx="15" cy="15" r="7" fill="white"/></svg>`)}`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});

// Component to auto-center on driver position
function MapCenterUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const isFirstRef = useRef(true);

  useEffect(() => {
    if (isFirstRef.current) {
      map.setView([lat, lng], 14);
      isFirstRef.current = false;
    } else {
      map.panTo([lat, lng]);
    }
  }, [lat, lng, map]);

  return null;
}

const statusLabels: Record<string, string> = {
  aceita: 'Aceita',
  pendente_coleta: 'Coleta Pendente',
  coletada: 'Coletada',
  em_rota: 'Em Trânsito',
  pendente_entrega: 'Entrega Pendente',
  solicitada: 'Solicitada',
  enviada: 'Enviada',
};

export const DriverTrackingDialog = ({
  open,
  onOpenChange,
  driverId,
  driverName,
  requestNumber,
  originAddress,
  destinationAddress,
  status,
}: DriverTrackingDialogProps) => {
  const { location, isLoading } = useDriverLocation(driverId);

  // Simple geocoding approximation - use driver location as center
  // In production you'd geocode the addresses
  const driverPos = useMemo(() => {
    if (!location) return null;
    return { lat: location.latitude, lng: location.longitude };
  }, [location]);

  const speedKmh = location?.speed ? Math.round(location.speed * 3.6) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Navigation className="h-5 w-5 text-primary" />
            Acompanhar Entrega
            {requestNumber && (
              <span className="font-mono text-primary">
                #{String(requestNumber).padStart(6, '0')}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[400px] sm:h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full bg-muted">
              <div className="text-center space-y-2">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground">Carregando localização...</p>
              </div>
            </div>
          ) : !driverPos ? (
            <div className="flex items-center justify-center h-full bg-muted">
              <div className="text-center space-y-2">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Localização do motorista não disponível
                </p>
                <p className="text-xs text-muted-foreground">
                  O GPS será ativado quando o motorista aceitar a corrida
                </p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={[driverPos.lat, driverPos.lng]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapCenterUpdater lat={driverPos.lat} lng={driverPos.lng} />
              <Marker position={[driverPos.lat, driverPos.lng]} icon={vehicleIcon} />
            </MapContainer>
          )}

          {/* Info overlay card */}
          {driverPos && (
            <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-background/95 backdrop-blur-sm rounded-xl border shadow-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{driverName}</p>
                    {status && (
                      <Badge variant="outline" className="text-xs">
                        {statusLabels[status] || status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{speedKmh} km/h</span>
                  </div>
                </div>
              </div>

              {(originAddress || destinationAddress) && (
                <div className="space-y-1 text-xs">
                  {originAddress && (
                    <div className="flex items-start gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground truncate">{originAddress}</span>
                    </div>
                  )}
                  {destinationAddress && (
                    <div className="flex items-start gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground truncate">{destinationAddress}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
