import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Trash2, FileDown, Pencil, Loader2, Paperclip, Download } from 'lucide-react';
import { format } from 'date-fns';
import { parseDateString } from '@/lib/utils';
import { VehicleLog, OilChangeRecord, MaintenanceRecord, useDeleteVehicleLog, useDeleteOilChange, useDeleteMaintenanceRecord, useUpdateVehicleLog, useUpdateOilChange, useUpdateMaintenanceRecord } from '@/hooks/useVehicleLogs';
import { KmInput, formatKmDisplay } from '@/components/ui/km-input';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoAguiaPdf from '@/assets/logo-aguia-pdf.png';
import { supabase } from '@/integrations/supabase/client';
import { AttachmentItem } from '@/components/shared/AttachmentItem';
import FileUploadArea, { type UploadedFile } from '@/components/shared/FileUploadArea';

const fuelTypeLabel: Record<string, string> = {
  diesel: 'Diesel',
  gasolina: 'Gasolina',
  gnv: 'Gás (GNV)',
  alcool: 'Álcool',
};

const maintenanceTypeLabel: Record<string, string> = {
  preventiva: 'Preventiva',
  corretiva: 'Corretiva',
  preditiva: 'Preditiva',
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

// Fuel detail dialog
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
          <div><Label>Km Atual</Label>{editing ? <KmInput value={form.km_atual} onValueChange={v => setForm((p: any) => ({ ...p, km_atual: v }))} /> : <Input readOnly value={formatKmDisplay(record.km_final)} className="bg-muted" />}</div>
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

// Oil detail dialog
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
            <div><Label>Km na Troca</Label>{editing ? <KmInput value={form.km_at_change} onValueChange={v => setForm((p: any) => ({ ...p, km_at_change: v }))} /> : <Input readOnly value={formatKmDisplay(record.km_at_change)} className="bg-muted" />}</div>
            <div><Label>Próx. Troca (Km)</Label>{editing ? <KmInput value={form.next_change_km} onValueChange={v => setForm((p: any) => ({ ...p, next_change_km: v }))} /> : <Input readOnly value={formatKmDisplay(record.next_change_km)} className="bg-muted" />}</div>
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

// Maintenance detail dialog
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
          <div><Label>Km Atual</Label>{editing ? <KmInput value={form.current_km} onValueChange={v => setForm((p: any) => ({ ...p, current_km: v }))} /> : <Input readOnly value={formatKmDisplay(record.current_km)} className="bg-muted" />}</div>
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

interface Props {
  filteredLogs: VehicleLog[];
  filteredOilRecords: OilChangeRecord[];
  filteredMaintenanceRecords: MaintenanceRecord[];
  allVehicles: any[];
  vehicleStats?: any[];
  plateFilter?: string;
}

const VehicleHistoryGrids = ({ filteredLogs, filteredOilRecords, filteredMaintenanceRecords, allVehicles, vehicleStats = [], plateFilter = 'all' }: Props) => {
  const deleteLog = useDeleteVehicleLog();
  const deleteOil = useDeleteOilChange();
  const deleteMaint = useDeleteMaintenanceRecord();

  const [viewingLog, setViewingLog] = useState<VehicleLog | null>(null);
  const [viewingOil, setViewingOil] = useState<OilChangeRecord | null>(null);
  const [viewingMaint, setViewingMaint] = useState<MaintenanceRecord | null>(null);

  const handleDeleteLog = (id: string) => {
    if (confirm('Deseja excluir este registro de abastecimento?')) deleteLog.mutate(id);
  };
  const handleDeleteOil = (id: string) => {
    if (confirm('Deseja excluir este registro de troca de óleo?')) deleteOil.mutate(id);
  };
  const handleDeleteMaint = (id: string) => {
    if (confirm('Deseja excluir este registro de manutenção?')) deleteMaint.mutate(id);
  };

  const getVehicleType = (vehicleId: string) => {
    const v = allVehicles.find((v: any) => v.id === vehicleId);
    return v?.type || '-';
  };

  const handleExportAllPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    try { doc.addImage(logoAguiaPdf, 'PNG', pageWidth - 55, 4, 50, 22); } catch {}

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Completo de Registros', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 23);

    let y = 32;

    // Painel Completo de Veículos
    if (vehicleStats.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Painel Completo de Veículos', 14, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        head: [['Tipo', 'Placa', 'Km Atual', 'Gasto Comb.', 'Gasto Troca Óleo', 'Gasto Manut.', 'Qtd Manutenções', 'Óleo']],
        body: vehicleStats.map((v: any) => [
          v.type || '-',
          plateFilter !== 'all' ? plateFilter : (v.displayPlate || v.plate || '-'),
          formatKmDisplay(v.currentKm) || '0',
          `R$ ${(v.totalCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `R$ ${(v.oilCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `R$ ${(v.maintCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          String(v.maintCount || 0),
          v.oilWarning ? 'Trocar' : v.latestOil ? 'OK' : '-',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [211, 33, 39], fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        margin: { left: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }
    }

    // Fuel logs
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Histórico de Registros (Combustível)', 14, y);
    y += 3;

    if (filteredLogs.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Data', 'Veículo', 'Placa', 'Km Atual', 'Combustível', 'Litros', 'R$/L', 'Total']],
        body: filteredLogs.map(l => [
          format(parseDateString(l.log_date), 'dd/MM/yyyy'),
          getVehicleType(l.vehicle_id),
          l.vehicle_plate || '-',
          formatKmDisplay(l.km_final) || '-',
          fuelTypeLabel[l.fuel_type] || l.fuel_type,
          l.liters?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '-',
          l.fuel_price ? `R$ ${l.fuel_price.toFixed(2)}` : '-',
          l.total_cost ? `R$ ${l.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [211, 33, 39], fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        margin: { left: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    } else {
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text('Nenhum registro.', 14, y + 4); y += 12;
    }

    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }

    // Oil
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Histórico de Troca de Óleo', 14, y);
    y += 3;

    if (filteredOilRecords.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Data', 'Veículo', 'Placa', 'Km na Troca', 'Próx. Troca', 'Tipo Óleo', 'Custo']],
        body: filteredOilRecords.map(o => [
          format(parseDateString(o.change_date), 'dd/MM/yyyy'),
          getVehicleType(o.vehicle_id),
          o.vehicle_plate || '-',
          formatKmDisplay(o.km_at_change),
          formatKmDisplay(o.next_change_km),
          o.oil_type || '-',
          o.service_cost ? `R$ ${o.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [211, 33, 39], fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        margin: { left: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    } else {
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text('Nenhum registro.', 14, y + 4); y += 12;
    }

    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }

    // Maintenance
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Histórico de Manutenção', 14, y);
    y += 3;

    if (filteredMaintenanceRecords.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Data', 'Veículo', 'Placa', 'Tipo', 'Km Atual', 'Custo']],
        body: filteredMaintenanceRecords.map(m => [
          format(parseDateString(m.maintenance_date), 'dd/MM/yyyy'),
          getVehicleType(m.vehicle_id),
          m.vehicle_plate || '-',
          maintenanceTypeLabel[m.maintenance_type] || m.maintenance_type,
          formatKmDisplay(m.current_km),
          m.service_cost ? `R$ ${m.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [211, 33, 39], fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        margin: { left: 14 },
      });
    } else {
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text('Nenhum registro.', 14, y + 4);
    }

    doc.save(`registros-veiculos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Export button */}
      <div className="flex justify-end">
        <Button onClick={handleExportAllPDF} variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Exportar Todos os Registros (PDF)
        </Button>
      </div>

      {/* Fuel History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Registros</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum registro de abastecimento.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Km Atual</TableHead>
                    <TableHead>Combustível</TableHead>
                    <TableHead>Litros</TableHead>
                    <TableHead>R$/L</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>{format(parseDateString(log.log_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{log.vehicle?.type || getVehicleType(log.vehicle_id)}</TableCell>
                      <TableCell>{log.vehicle_plate || '-'}</TableCell>
                      <TableCell className="font-medium">{formatKmDisplay(log.km_final) || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{fuelTypeLabel[log.fuel_type] || log.fuel_type}</Badge></TableCell>
                      <TableCell>{log.liters?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '-'}</TableCell>
                      <TableCell>{log.fuel_price ? `R$ ${log.fuel_price.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="font-medium">{log.total_cost ? `R$ ${log.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewingLog(log)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteLog(log.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Oil Change History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Troca de Óleo</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOilRecords.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum registro de troca de óleo.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Km na Troca</TableHead>
                    <TableHead>Próx. Troca</TableHead>
                    <TableHead>Tipo Óleo</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOilRecords.map(oil => (
                    <TableRow key={oil.id}>
                      <TableCell>{format(parseDateString(oil.change_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{oil.vehicle?.type || getVehicleType(oil.vehicle_id)}</TableCell>
                      <TableCell>{oil.vehicle_plate || '-'}</TableCell>
                      <TableCell>{formatKmDisplay(oil.km_at_change)}</TableCell>
                      <TableCell>{formatKmDisplay(oil.next_change_km)}</TableCell>
                      <TableCell>{oil.oil_type || '-'}</TableCell>
                      <TableCell className="font-medium">{oil.service_cost ? `R$ ${oil.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewingOil(oil)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteOil(oil.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Manutenção</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMaintenanceRecords.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum registro de manutenção.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Km Atual</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaintenanceRecords.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{format(parseDateString(m.maintenance_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{m.vehicle?.type || getVehicleType(m.vehicle_id)}</TableCell>
                      <TableCell>{m.vehicle_plate || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={m.maintenance_type === 'corretiva' ? 'destructive' : m.maintenance_type === 'preventiva' ? 'default' : 'secondary'}>
                          {maintenanceTypeLabel[m.maintenance_type] || m.maintenance_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatKmDisplay(m.current_km)}</TableCell>
                      <TableCell className="font-medium">{m.service_cost ? `R$ ${m.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewingMaint(m)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteMaint(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialogs */}
      <FuelDetailDialog record={viewingLog} open={!!viewingLog} onClose={() => setViewingLog(null)} />
      <OilDetailDialog record={viewingOil} open={!!viewingOil} onClose={() => setViewingOil(null)} />
      <MaintDetailDialog record={viewingMaint} open={!!viewingMaint} onClose={() => setViewingMaint(null)} />
    </div>
  );
};

export default VehicleHistoryGrids;
