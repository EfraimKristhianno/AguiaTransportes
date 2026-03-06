import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VehicleLog, OilChangeRecord, MaintenanceRecord, useUpdateVehicleLog, useUpdateOilChange, useUpdateMaintenanceRecord } from '@/hooks/useVehicleLogs';
import { format } from 'date-fns';
import { parseDateString } from '@/lib/utils';
import { Fuel, Droplets, Wrench, Eye, Paperclip, Loader2, Download, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AttachmentItem } from '@/components/shared/AttachmentItem';
import FileUploadArea, { type UploadedFile } from '@/components/shared/FileUploadArea';

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

const parseNotes = (notes: string | null): { text: string; attachments: string[] } => {
  if (!notes) return { text: '', attachments: [] };
  const match = notes.match(/\[anexos:([^\]]+)\]/);
  const attachments = match ? match[1].split(',').map(s => s.trim()).filter(Boolean) : [];
  const text = notes.replace(/\n?\[anexos:[^\]]+\]/, '').trim();
  return { text, attachments };
};

const buildNotesWithAttachments = (text: string, paths: string[]): string | null => {
  const clean = text.trim();
  if (!clean && !paths.length) return null;
  if (!paths.length) return clean || null;
  return clean ? `${clean}\n[anexos:${paths.join(',')}]` : `[anexos:${paths.join(',')}]`;
};

const uploadFilesHelper = async (files: UploadedFile[], folder: string): Promise<string[]> => {
  const paths: string[] = [];
  for (const f of files) {
    const filePath = `${folder}/${Date.now()}_${f.file.name}`;
    const { error } = await supabase.storage.from('vehicle-attachments').upload(filePath, f.file);
    if (!error) paths.push(filePath);
  }
  return paths;
};

// Inline attachment viewer
const VehicleAttachment = ({ path, index }: { path: string; index: number }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUrl = async () => {
      setLoading(true);
      const { data, error } = await supabase.storage.from('vehicle-attachments').createSignedUrl(path, 3600);
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

// Fuel detail dialog with edit support
const FuelDetailDialog = ({ record, open, onClose }: { record: VehicleLog | null; open: boolean; onClose: () => void }) => {
  const updateLog = useUpdateVehicleLog();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [atts, setAtts] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    if (record) {
      const { text, attachments: a } = parseNotes(record.notes);
      setForm({ vehicle_plate: record.vehicle_plate || '', log_date: record.log_date, km_atual: String(record.km_final || ''), fuel_type: record.fuel_type || 'diesel', liters: String(record.liters || ''), fuel_price: String(record.fuel_price || ''), notes: text });
      setAtts(a); setNewFiles([]); setEditing(false);
    }
  }, [record]);

  if (!record || !form) return null;

  const totalCost = editing
    ? (form.liters && form.fuel_price ? (parseFloat(form.liters) * parseFloat(form.fuel_price)).toFixed(2) : '0.00')
    : (record.total_cost ? record.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-');

  const handleSave = async () => {
    const newPaths = await uploadFilesHelper(newFiles, `logs/admin`);
    const allPaths = [...atts, ...newPaths];
    updateLog.mutate({
      id: record.id, log_date: form.log_date, km_final: parseFloat(form.km_atual) || 0,
      liters: form.liters ? parseFloat(form.liters) : null, fuel_price: form.fuel_price ? parseFloat(form.fuel_price) : null,
      total_cost: form.liters && form.fuel_price ? parseFloat(form.liters) * parseFloat(form.fuel_price) : null,
      fuel_type: form.fuel_type, vehicle_plate: form.vehicle_plate || null,
      notes: buildNotesWithAttachments(form.notes || '', allPaths),
    }, { onSuccess: () => { setEditing(false); onClose(); } });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Editar Registro' : 'Detalhes do Registro'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Veículo</Label><Input readOnly value={record.vehicle?.type || '-'} className="bg-muted" /></div>
          <div><Label>Placa</Label><Input readOnly={!editing} value={form.vehicle_plate} onChange={e => setForm((p: any) => ({ ...p, vehicle_plate: e.target.value }))} className={!editing ? 'bg-muted' : ''} /></div>
          <div><Label>Data</Label>{editing ? <Input type="date" value={form.log_date} onChange={e => setForm((p: any) => ({ ...p, log_date: e.target.value }))} /> : <Input readOnly value={format(parseDateString(record.log_date), 'dd/MM/yyyy')} className="bg-muted" />}</div>
          <div><Label>Km Atual</Label><Input readOnly={!editing} type={editing ? 'number' : 'text'} value={editing ? form.km_atual : (record.km_final?.toLocaleString('pt-BR') || '-')} onChange={e => setForm((p: any) => ({ ...p, km_atual: e.target.value }))} className={!editing ? 'bg-muted' : ''} /></div>
          <div>
            <Label>Tipo de Combustível</Label>
            {editing ? (
              <Select value={form.fuel_type} onValueChange={v => setForm((p: any) => ({ ...p, fuel_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="diesel">Diesel</SelectItem><SelectItem value="gasolina">Gasolina</SelectItem><SelectItem value="gnv">Gás (GNV)</SelectItem></SelectContent>
              </Select>
            ) : <Input readOnly value={fuelTypeLabel[record.fuel_type] || record.fuel_type} className="bg-muted" />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Litros</Label><Input readOnly={!editing} type={editing ? 'number' : 'text'} step="0.01" value={editing ? form.liters : (record.liters?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '-')} onChange={e => setForm((p: any) => ({ ...p, liters: e.target.value }))} className={!editing ? 'bg-muted' : ''} /></div>
            <div><Label>Preço/Litro (R$)</Label><Input readOnly={!editing} type={editing ? 'number' : 'text'} step="0.01" value={editing ? form.fuel_price : (record.fuel_price ? `R$ ${record.fuel_price.toFixed(2)}` : '-')} onChange={e => setForm((p: any) => ({ ...p, fuel_price: e.target.value }))} className={!editing ? 'bg-muted' : ''} /></div>
          </div>
          <div><Label>Total</Label><Input readOnly value={editing ? `R$ ${totalCost}` : (record.total_cost ? `R$ ${totalCost}` : '-')} className="bg-muted font-medium" /></div>
          <div><Label>Observações</Label><Textarea readOnly={!editing} value={form.notes || (editing ? '' : 'Sem observações')} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} className={!editing ? 'bg-muted resize-none' : ''} /></div>
          {atts.length > 0 && (
            <div>
              <Label>Anexos ({atts.length})</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {atts.map((path, i) => editing ? <AttachmentItem key={path} path={path} index={i} bucket="vehicle-attachments" onRemove={() => setAtts(prev => prev.filter((_, idx) => idx !== i))} /> : <VehicleAttachment key={path} path={path} index={i} />)}
              </div>
            </div>
          )}
          {editing && <FileUploadArea files={newFiles} onFilesChange={setNewFiles} />}
          <div className="flex gap-2">
            {!editing ? <Button variant="outline" className="w-full" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-2" /> Editar</Button> : (
              <><Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancelar</Button><Button className="flex-1" onClick={handleSave} disabled={updateLog.isPending}>{updateLog.isPending ? 'Salvando...' : 'Salvar Alterações'}</Button></>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Oil detail dialog with edit support
const OilDetailDialog = ({ record, open, onClose }: { record: OilChangeRecord | null; open: boolean; onClose: () => void }) => {
  const updateOil = useUpdateOilChange();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [atts, setAtts] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    if (record) {
      const { text, attachments: a } = parseNotes(record.notes);
      setForm({ vehicle_plate: record.vehicle_plate || '', change_date: record.change_date, km_at_change: String(record.km_at_change), next_change_km: String(record.next_change_km), oil_type: record.oil_type || '', service_cost: String(record.service_cost || ''), notes: text });
      setAtts(a); setNewFiles([]); setEditing(false);
    }
  }, [record]);

  if (!record || !form) return null;

  const handleSave = async () => {
    const newPaths = await uploadFilesHelper(newFiles, `oil/admin`);
    const allPaths = [...atts, ...newPaths];
    updateOil.mutate({
      id: record.id, change_date: form.change_date, km_at_change: parseFloat(form.km_at_change) || 0,
      next_change_km: parseFloat(form.next_change_km) || 0, oil_type: form.oil_type || null,
      service_cost: form.service_cost ? parseFloat(form.service_cost) : null, vehicle_plate: form.vehicle_plate || null,
      notes: buildNotesWithAttachments(form.notes || '', allPaths),
    }, { onSuccess: () => { setEditing(false); onClose(); } });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Editar Troca de Óleo' : 'Detalhes da Troca de Óleo'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Veículo</Label><Input readOnly value={record.vehicle?.type || '-'} className="bg-muted" /></div>
          <div><Label>Placa</Label><Input readOnly={!editing} value={form.vehicle_plate} onChange={e => setForm((p: any) => ({ ...p, vehicle_plate: e.target.value }))} className={!editing ? 'bg-muted' : ''} /></div>
          <div><Label>Data da Troca</Label>{editing ? <Input type="date" value={form.change_date} onChange={e => setForm((p: any) => ({ ...p, change_date: e.target.value }))} /> : <Input readOnly value={format(parseDateString(record.change_date), 'dd/MM/yyyy')} className="bg-muted" />}</div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Km na Troca</Label><Input readOnly={!editing} type={editing ? 'number' : 'text'} value={editing ? form.km_at_change : record.km_at_change.toLocaleString('pt-BR')} onChange={e => setForm((p: any) => ({ ...p, km_at_change: e.target.value }))} className={!editing ? 'bg-muted' : ''} /></div>
            <div><Label>Próx. Troca (Km)</Label><Input readOnly={!editing} type={editing ? 'number' : 'text'} value={editing ? form.next_change_km : record.next_change_km.toLocaleString('pt-BR')} onChange={e => setForm((p: any) => ({ ...p, next_change_km: e.target.value }))} className={!editing ? 'bg-muted' : ''} /></div>
          </div>
          <div><Label>Tipo de Óleo</Label><Input readOnly={!editing} value={editing ? form.oil_type : (record.oil_type || '-')} onChange={e => setForm((p: any) => ({ ...p, oil_type: e.target.value }))} className={!editing ? 'bg-muted' : ''} /></div>
          <div><Label>Custo do Serviço (R$)</Label><Input readOnly={!editing} type={editing ? 'number' : 'text'} step="0.01" value={editing ? form.service_cost : (record.service_cost ? `R$ ${record.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-')} onChange={e => setForm((p: any) => ({ ...p, service_cost: e.target.value }))} className={!editing ? 'bg-muted' : ''} /></div>
          <div><Label>Observações</Label><Textarea readOnly={!editing} value={form.notes || (editing ? '' : 'Sem observações')} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} className={!editing ? 'bg-muted resize-none' : ''} /></div>
          {atts.length > 0 && (
            <div>
              <Label>Anexos ({atts.length})</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {atts.map((path, i) => editing ? <AttachmentItem key={path} path={path} index={i} bucket="vehicle-attachments" onRemove={() => setAtts(prev => prev.filter((_, idx) => idx !== i))} /> : <VehicleAttachment key={path} path={path} index={i} />)}
              </div>
            </div>
          )}
          {editing && <FileUploadArea files={newFiles} onFilesChange={setNewFiles} />}
          <div className="flex gap-2">
            {!editing ? <Button variant="outline" className="w-full" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-2" /> Editar</Button> : (
              <><Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancelar</Button><Button className="flex-1" onClick={handleSave} disabled={updateOil.isPending}>{updateOil.isPending ? 'Salvando...' : 'Salvar Alterações'}</Button></>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Maintenance detail dialog with edit support
const MaintDetailDialog = ({ record, open, onClose }: { record: MaintenanceRecord | null; open: boolean; onClose: () => void }) => {
  const updateMaint = useUpdateMaintenanceRecord();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [atts, setAtts] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    if (record) {
      const { text, attachments: a } = parseNotes(record.notes);
      setForm({ vehicle_plate: record.vehicle_plate || '', maintenance_type: record.maintenance_type, maintenance_date: record.maintenance_date, current_km: String(record.current_km), service_cost: String(record.service_cost || ''), notes: text });
      setAtts(a); setNewFiles([]); setEditing(false);
    }
  }, [record]);

  if (!record || !form) return null;

  const handleSave = async () => {
    const newPaths = await uploadFilesHelper(newFiles, `maintenance/admin`);
    const allPaths = [...atts, ...newPaths];
    updateMaint.mutate({
      id: record.id, maintenance_type: form.maintenance_type, maintenance_date: form.maintenance_date,
      current_km: parseFloat(form.current_km) || 0, service_cost: form.service_cost ? parseFloat(form.service_cost) : null,
      vehicle_plate: form.vehicle_plate || '', notes: buildNotesWithAttachments(form.notes || '', allPaths),
    }, { onSuccess: () => { setEditing(false); onClose(); } });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Editar Manutenção' : 'Detalhes da Manutenção'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo de Manutenção</Label>
            {editing ? (
              <Select value={form.maintenance_type} onValueChange={v => setForm((p: any) => ({ ...p, maintenance_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="preventiva">Preventiva</SelectItem><SelectItem value="corretiva">Corretiva</SelectItem><SelectItem value="preditiva">Preditiva</SelectItem></SelectContent>
              </Select>
            ) : <Input readOnly value={maintenanceTypeLabel[record.maintenance_type] || record.maintenance_type} className="bg-muted" />}
          </div>
          <div><Label>Veículo</Label><Input readOnly value={record.vehicle?.type || '-'} className="bg-muted" /></div>
          <div><Label>Placa</Label><Input readOnly={!editing} value={form.vehicle_plate} onChange={e => setForm((p: any) => ({ ...p, vehicle_plate: e.target.value }))} className={!editing ? 'bg-muted' : ''} /></div>
          <div><Label>Data</Label>{editing ? <Input type="date" value={form.maintenance_date} onChange={e => setForm((p: any) => ({ ...p, maintenance_date: e.target.value }))} /> : <Input readOnly value={format(parseDateString(record.maintenance_date), 'dd/MM/yyyy')} className="bg-muted" />}</div>
          <div><Label>Km Atual</Label><Input readOnly={!editing} type={editing ? 'number' : 'text'} value={editing ? form.current_km : record.current_km.toLocaleString('pt-BR')} onChange={e => setForm((p: any) => ({ ...p, current_km: e.target.value }))} className={!editing ? 'bg-muted' : ''} /></div>
          <div><Label>Custo do Serviço (R$)</Label><Input readOnly={!editing} type={editing ? 'number' : 'text'} step="0.01" value={editing ? form.service_cost : (record.service_cost ? `R$ ${record.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-')} onChange={e => setForm((p: any) => ({ ...p, service_cost: e.target.value }))} className={!editing ? 'bg-muted' : ''} /></div>
          <div><Label>Observações</Label><Textarea readOnly={!editing} value={form.notes || (editing ? '' : 'Sem observações')} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} className={!editing ? 'bg-muted resize-none' : ''} /></div>
          {atts.length > 0 && (
            <div>
              <Label>Anexos ({atts.length})</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {atts.map((path, i) => editing ? <AttachmentItem key={path} path={path} index={i} bucket="vehicle-attachments" onRemove={() => setAtts(prev => prev.filter((_, idx) => idx !== i))} /> : <VehicleAttachment key={path} path={path} index={i} />)}
              </div>
            </div>
          )}
          {editing && <FileUploadArea files={newFiles} onFilesChange={setNewFiles} />}
          <div className="flex gap-2">
            {!editing ? <Button variant="outline" className="w-full" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-2" /> Editar</Button> : (
              <><Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancelar</Button><Button className="flex-1" onClick={handleSave} disabled={updateMaint.isPending}>{updateMaint.isPending ? 'Salvando...' : 'Salvar Alterações'}</Button></>
            )}
          </div>
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
                          <TableCell>{format(parseDateString(log.log_date), 'dd/MM/yyyy')}</TableCell>
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
                          <TableCell>{format(parseDateString(oil.change_date), 'dd/MM/yyyy')}</TableCell>
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
                          <TableCell>{format(parseDateString(m.maintenance_date), 'dd/MM/yyyy')}</TableCell>
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
