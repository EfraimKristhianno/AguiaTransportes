import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { VehicleLog, OilChangeRecord, MaintenanceRecord } from '@/hooks/useVehicleLogs';
import { format } from 'date-fns';
import { Fuel, Droplets, Wrench } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehiclePlate: string;
  logs: VehicleLog[];
  oilRecords: OilChangeRecord[];
  maintenanceRecords: MaintenanceRecord[];
}

const maintenanceTypeLabel: Record<string, string> = {
  preventiva: 'Preventiva',
  corretiva: 'Corretiva',
  preditiva: 'Preditiva',
};

const VehicleHistoryDialog = ({ open, onOpenChange, vehiclePlate, vehicleId, logs, oilRecords, maintenanceRecords }: Props) => {
  const vLogs = logs.filter(l => l.vehicle_id === vehicleId);
  const vOil = oilRecords.filter(o => o.vehicle_id === vehicleId);
  const vMaint = maintenanceRecords.filter(m => m.vehicle_id === vehicleId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico do Veículo - {vehiclePlate}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="fuel" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fuel" className="gap-1"><Fuel className="h-4 w-4" /> Abastecimento</TabsTrigger>
            <TabsTrigger value="oil" className="gap-1"><Droplets className="h-4 w-4" /> Troca Óleo</TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-1"><Wrench className="h-4 w-4" /> Manutenção</TabsTrigger>
          </TabsList>

          <TabsContent value="fuel">
            {vLogs.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Nenhum registro de abastecimento.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Km Atual</TableHead>
                      <TableHead>Combustível</TableHead>
                      <TableHead>Litros</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>{format(new Date(log.log_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{log.driver?.name || '-'}</TableCell>
                        <TableCell>{vehiclePlate}</TableCell>
                        <TableCell className="font-medium">{log.km_final?.toLocaleString('pt-BR')}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{log.fuel_type}</Badge></TableCell>
                        <TableCell>{log.liters?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '-'}</TableCell>
                        <TableCell className="font-medium">{log.total_cost ? `R$ ${log.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="oil">
            {vOil.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Nenhum registro de troca de óleo.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Km na Troca</TableHead>
                      <TableHead>Próx. Troca</TableHead>
                      <TableHead>Tipo Óleo</TableHead>
                      <TableHead>Obs.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vOil.map(oil => (
                      <TableRow key={oil.id}>
                        <TableCell>{format(new Date(oil.change_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{oil.driver?.name || '-'}</TableCell>
                        <TableCell>{oil.km_at_change.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{oil.next_change_km.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{oil.oil_type || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{oil.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="maintenance">
            {vMaint.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Nenhum registro de manutenção.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Km Atual</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Obs.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vMaint.map(m => (
                      <TableRow key={m.id}>
                        <TableCell>{format(new Date(m.maintenance_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant={m.maintenance_type === 'corretiva' ? 'destructive' : m.maintenance_type === 'preventiva' ? 'default' : 'secondary'}>
                            {maintenanceTypeLabel[m.maintenance_type] || m.maintenance_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{m.driver?.name || '-'}</TableCell>
                        <TableCell>{m.current_km.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="font-medium">{m.service_cost ? `R$ ${m.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{m.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleHistoryDialog;
