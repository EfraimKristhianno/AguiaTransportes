 import { Info } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import {
   Popover,
   PopoverContent,
   PopoverTrigger,
 } from '@/components/ui/popover';
 
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
  { type: 'Carro', length: 1.20, width: 1.00, height: 0.80, capacity: 200 },
  { type: 'Van', length: 2.50, width: 1.50, height: 1.60, capacity: 1500 },
  { type: 'Caminhão', length: 6.00, width: 2.40, height: 2.40, capacity: 5000 },
  { type: 'Caminhão Baú', length: 7.00, width: 2.45, height: 2.80, capacity: 8000 },
  { type: 'Carreta', length: 14.00, width: 2.60, height: 2.80, capacity: 25000 },
 ];
 
 interface VehicleDetailsPopoverProps {
   vehicleType: string;
   triggerClassName?: string;
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
 
 const VehicleDetailsPopover = ({ vehicleType, triggerClassName }: VehicleDetailsPopoverProps) => {
   const spec = VEHICLE_SPECS.find(s => s.type === vehicleType);
 
   if (!spec) {
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
       <PopoverContent className="w-64" align="start">
         <div className="space-y-3">
           <h4 className="font-semibold text-sm text-foreground">{spec.type}</h4>
           <div className="grid grid-cols-2 gap-2 text-sm">
             <div className="text-muted-foreground">Comprimento:</div>
             <div className="font-medium">{formatDimension(spec.length)}</div>
             
             <div className="text-muted-foreground">Largura:</div>
             <div className="font-medium">{formatDimension(spec.width)}</div>
             
             <div className="text-muted-foreground">Altura:</div>
             <div className="font-medium">{formatDimension(spec.height)}</div>
             
             <div className="text-muted-foreground">Capacidade:</div>
             <div className="font-medium">{formatWeight(spec.capacity)}</div>
           </div>
         </div>
       </PopoverContent>
     </Popover>
   );
 };
 
 export default VehicleDetailsPopover;
 export { VEHICLE_SPECS, type VehicleSpec };