import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFreightPrices } from '@/hooks/useFreightPrices';

interface VehicleSpec {
  type: string;
  length?: number;
  width?: number;
  height?: number;
  capacity?: number;
}

// Vehicle specifications from database
const VEHICLE_SPECS: VehicleSpec[] = [
  { type: 'Moto', length: 0.60, width: 0.60, height: 0.50, capacity: 25 },
  { type: 'Fiorino', length: 1.60, width: 1.10, height: 1.45, capacity: 450 },
  { type: 'Caminhão', length: 8.50, width: 2.48, height: 2.70, capacity: 12000 },
  { type: 'Caminhão (3/4)', length: 6.18, width: 2.39, height: 2.39, capacity: 5000 },
];

interface VehicleDetailsPopoverProps {
  vehicleType: string;
  triggerClassName?: string;
  clientId?: string | null;
}

const formatDimension = (value: number): string => {
  if (value < 1) {
    return `${(value * 100).toFixed(0)} cm`;
  }
  return `${value.toFixed(2)} m`;
};

const formatWeight = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} ton`;
  }
  return `${value} kg`;
};

const VehicleDetailsPopover = ({ vehicleType, triggerClassName, clientId }: VehicleDetailsPopoverProps) => {
  const spec = VEHICLE_SPECS.find(s => s.type === vehicleType);
  const { data: freightPrices = [] } = useFreightPrices(clientId);

  const prices = freightPrices.filter(p => p.transport_type === vehicleType);

  if (!spec && prices.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={triggerClassName}
        >
          <Info className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-foreground">{spec?.type || vehicleType}</h4>
          {spec && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Comprimento:</div>
              <div className="font-medium">{formatDimension(spec.length!)}</div>
              
              <div className="text-muted-foreground">Largura:</div>
              <div className="font-medium">{formatDimension(spec.width!)}</div>
              
              <div className="text-muted-foreground">Altura:</div>
              <div className="font-medium">{formatDimension(spec.height!)}</div>
              
              <div className="text-muted-foreground">Capacidade:</div>
              <div className="font-medium">{formatWeight(spec.capacity!)}</div>
            </div>
          )}

          {prices.length > 0 && (
            <>
              <div className="border-t border-border pt-2">
                <h5 className="font-semibold text-sm text-foreground mb-2">Valores do Frete</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {prices.map(p => (
                    <div key={p.id} className="contents">
                      <div className="text-muted-foreground">{p.region}:</div>
                      <div className="font-medium text-primary">
                        R$ {Number(p.price).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VehicleDetailsPopover;
export { VEHICLE_SPECS, type VehicleSpec };
