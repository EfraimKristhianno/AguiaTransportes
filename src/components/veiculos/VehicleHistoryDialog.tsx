import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const fuelTypeLabel: Record<string, string> = {
  diesel: 'Diesel',
  gasolina: 'Gasolina',
  gnv: 'Gás (GNV)',
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

// Read-only detail dialog for fuel logs
const FuelDetailDialog = ({ record, open, onClose }: { record: VehicleLog | null; open: boolean; onClose: () => void }) => {
  if (!record) return null;
  const { text, attachments } = parseNotes(record.notes);
  const totalCost = record.total_cost ? `R$ ${record.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-';
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Detalhes do Registro</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Veículo</Label><Input readOnly value={record.vehicle?.type || '-'} className="bg-muted" /></div>
          <div><Label>Placa</Label><Input readOnly value={record.vehicle_plate || '-'} className="bg-muted" /></div>
          <div><Label>Data</Label><Input readOnly value={format(new Date(record.log_date), 'dd/MM/yyyy')} className="bg-muted" /></div>
          <div><Label>Km Atual</Label><Input readOnly value={record.km_final?.toLocaleString('pt-BR') || '-'} className="bg-muted" /></div>
          <div><Label>Tipo de Combustível</Label><Input readOnly value={fuelTypeLabel[record.fuel_type] || record.fuel_type} className="bg-muted" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Litros</Label><Input readOnly value={record.liters?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '-'} className="bg-muted" /></div>
            <div><Label>Preço/Litro (R$)</Label><Input readOnly value={record.fuel_price ? `R$ ${record.fuel_price.toFixed(2)}` : '-'} className="bg-muted" /></div>
          </div>
          <div><Label>Total</Label><Input readOnly value={totalCost} className="bg-muted font-medium" /></div>
          <div><Label>Observações</Label><Textarea readOnly value={text || 'Sem observações'} className="bg-muted resize-none" /></div>
          {attachments.length > 0 && (
            <div>
              <Label>Anexos ({attachments.length})</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {attachments.map((path, i) => <VehicleAttachment key={path} path={path} index={i} />)}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Read-only detail dialog for oil changes
const OilDetailDialog = ({ record, open, onClose }: { record: OilChangeRecord | null; open: boolean; onClose: () => void }) => {
  if (!record) return null;
  const { text, attachments } = parseNotes(record.notes);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Detalhes da Troca de Óleo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Veículo</Label><Input readOnly value={record.vehicle?.type || '-'} className="bg-muted" /></div>
          <div><Label>Placa</Label><Input readOnly value={record.vehicle_plate || '-'} className="bg-muted" /></div>
          <div><Label>Data da Troca</Label><Input readOnly value={format(new Date(record.change_date), 'dd/MM/yyyy')} className="bg-muted" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Km na Troca</Label><Input readOnly value={record.km_at_change.toLocaleString('pt-BR')} className="bg-muted" /></div>
            <div><Label>Próx. Troca (Km)</Label><Input readOnly value={record.next_change_km.toLocaleString('pt-BR')} className="bg-muted" /></div>
          </div>
          <div><Label>Tipo de Óleo</Label><Input readOnly value={record.oil_type || '-'} className="bg-muted" /></div>
          <div><Label>Custo do Serviço (R$)</Label><Input readOnly value={record.service_cost ? `R$ ${record.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'} className="bg-muted" /></div>
          <div><Label>Observações</Label><Textarea readOnly value={text || 'Sem observações'} className="bg-muted resize-none" /></div>
          {attachments.length > 0 && (
            <div>
              <Label>Anexos ({attachments.length})</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {attachments.map((path, i) => <VehicleAttachment key={path} path={path} index={i} />)}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Read-only detail dialog for maintenance
const MaintDetailDialog = ({ record, open, onClose }: { record: MaintenanceRecord | null; open: boolean; onClose: () => void }) => {
  if (!record) return null;
  const { text, attachments } = parseNotes(record.notes);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Detalhes da Manutenção</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Tipo de Manutenção</Label><Input readOnly value={maintenanceTypeLabel[record.maintenance_type] || record.maintenance_type} className="bg-muted" /></div>
          <div><Label>Veículo</Label><Input readOnly value={record.vehicle?.type || '-'} className="bg-muted" /></div>
          <div><Label>Placa</Label><Input readOnly value={record.vehicle_plate || '-'} className="bg-muted" /></div>
          <div><Label>Data</Label><Input readOnly value={format(new Date(record.maintenance_date), 'dd/MM/yyyy')} className="bg-muted" /></div>
          <div><Label>Km Atual</Label><Input readOnly value={record.current_km.toLocaleString('pt-BR')} className="bg-muted" /></div>
          <div><Label>Custo do Serviço (R$)</Label><Input readOnly value={record.service_cost ? `R$ ${record.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'} className="bg-muted" /></div>
          <div><Label>Observações</Label><Textarea readOnly value={text || 'Sem observações'} className="bg-muted resize-none" /></div>
          {attachments.length > 0 && (
            <div>
              <Label>Anexos ({attachments.length})</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {attachments.map((path, i) => <VehicleAttachment key={path} path={path} index={i} />)}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const VehicleHistoryDialog = ({ open, onOpenChange, vehiclePlate, vehicleId, logs, oilRecords, maintenanceRecords }: Props) => {
  const vLogs = logs.filter(l => l.vehicle_id === vehicleId);
  const vOil = oilRecords.filter(o => o.vehicle_id === vehicleId);
  const vMaint = maintenanceRecords.filter(m => m.vehicle_id === vehicleId);

  const [viewingLog, setViewingLog] = useState<VehicleLog | null>(null);
  const [viewingOil, setViewingOil] = useState<OilChangeRecord | null>(null);
  const [viewingMaint, setViewingMaint] = useState<MaintenanceRecord | null>(null);

  return (
    <>
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
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setViewingLog(log)}><Eye className="h-4 w-4" /></Button>
                          </TableCell>
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
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setViewingOil(oil)}><Eye className="h-4 w-4" /></Button>
                          </TableCell>
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
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setViewingMaint(m)}><Eye className="h-4 w-4" /></Button>
                          </TableCell>
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

      <FuelDetailDialog record={viewingLog} open={!!viewingLog} onClose={() => setViewingLog(null)} />
      <OilDetailDialog record={viewingOil} open={!!viewingOil} onClose={() => setViewingOil(null)} />
      <MaintDetailDialog record={viewingMaint} open={!!viewingMaint} onClose={() => setViewingMaint(null)} />
    </>
  );
};

export default VehicleHistoryDialog;
