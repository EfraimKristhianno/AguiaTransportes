import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { VehicleLog, OilChangeRecord, MaintenanceRecord } from '@/hooks/useVehicleLogs';
import { format } from 'date-fns';
import { Fuel, Droplets, Wrench, Eye, Paperclip, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

// Parse notes to extract text and attachment paths
const parseNotes = (notes: string | null): { text: string; attachments: string[] } => {
  if (!notes) return { text: '', attachments: [] };
  const match = notes.match(/\[anexos:([^\]]+)\]/);
  const attachments = match ? match[1].split(',').map(s => s.trim()).filter(Boolean) : [];
  const text = notes.replace(/\n?\[anexos:[^\]]+\]/, '').trim();
  return { text, attachments };
};

// Inline attachment viewer for vehicle-attachments bucket
const VehicleAttachment = ({ path, index }: { path: string; index: number }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUrl = async () => {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('vehicle-attachments')
        .createSignedUrl(path, 3600);
      if (!error && data?.signedUrl) setUrl(data.signedUrl);
      setLoading(false);
    };
    fetchUrl();
  }, [path]);

  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(path);
  const fileName = path.split('/').pop() || path;

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground py-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Carregando...</span></div>;
  if (!url) return <div className="flex items-center gap-2 text-sm text-destructive py-1"><Paperclip className="h-3.5 w-3.5" /><span>Erro ao carregar</span></div>;

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img src={url} alt={`Anexo ${index + 1}`} className="rounded-md max-h-32 object-cover border border-border hover:opacity-90 transition-opacity" />
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
      <Download className="h-3.5 w-3.5" />{fileName}
    </a>
  );
};

// Detail popover button
const DetailButton = ({ notes }: { notes: string | null }) => {
  const { text, attachments } = parseNotes(notes);
  const hasContent = text || attachments.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={hasContent ? '' : 'text-muted-foreground'}>
          <Eye className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[300px] overflow-y-auto" align="end">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Detalhes</h4>
          {text ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Observações</p>
              <p className="text-sm whitespace-pre-wrap">{text}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sem observações.</p>
          )}
          {attachments.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Anexos ({attachments.length})</p>
              <div className="space-y-2">
                {attachments.map((path, i) => (
                  <VehicleAttachment key={path} path={path} index={i} />
                ))}
              </div>
            </div>
          )}
          {!hasContent && <p className="text-sm text-muted-foreground">Nenhum detalhe registrado.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
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
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>{format(new Date(log.log_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{log.driver?.name || '-'}</TableCell>
                        <TableCell>{log.vehicle_plate || vehiclePlate}</TableCell>
                        <TableCell className="font-medium">{log.km_final?.toLocaleString('pt-BR')}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{log.fuel_type}</Badge></TableCell>
                        <TableCell>{log.liters?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '-'}</TableCell>
                        <TableCell className="font-medium">{log.total_cost ? `R$ ${log.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                        <TableCell><DetailButton notes={log.notes} /></TableCell>
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
                      <TableHead>Placa</TableHead>
                      <TableHead>Km na Troca</TableHead>
                      <TableHead>Próx. Troca</TableHead>
                      <TableHead>Tipo Óleo</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vOil.map(oil => (
                      <TableRow key={oil.id}>
                        <TableCell>{format(new Date(oil.change_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{oil.driver?.name || '-'}</TableCell>
                        <TableCell>{oil.vehicle_plate || vehiclePlate}</TableCell>
                        <TableCell>{oil.km_at_change.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{oil.next_change_km.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{oil.oil_type || '-'}</TableCell>
                        <TableCell><DetailButton notes={oil.notes} /></TableCell>
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
                      <TableHead>Placa</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Km Atual</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vMaint.map(m => (
                      <TableRow key={m.id}>
                        <TableCell>{format(new Date(m.maintenance_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{m.vehicle_plate || vehiclePlate}</TableCell>
                        <TableCell>
                          <Badge variant={m.maintenance_type === 'corretiva' ? 'destructive' : m.maintenance_type === 'preventiva' ? 'default' : 'secondary'}>
                            {maintenanceTypeLabel[m.maintenance_type] || m.maintenance_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{m.driver?.name || '-'}</TableCell>
                        <TableCell>{m.current_km.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="font-medium">{m.service_cost ? `R$ ${m.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                        <TableCell><DetailButton notes={m.notes} /></TableCell>
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
