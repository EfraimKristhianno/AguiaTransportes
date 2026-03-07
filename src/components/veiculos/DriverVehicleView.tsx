import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KmInput, formatKmDisplay } from '@/components/ui/km-input';
import PlateSelect from '@/components/veiculos/PlateSelect';

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

import { useCurrentDriver } from '@/hooks/useDriverRequests';
import { useVehicleLogs, useOilChangeRecords, useMaintenanceRecords, useCreateVehicleLog, useCreateOilChange, useCreateMaintenanceRecord, useUpdateVehicleLog, useDeleteVehicleLog, useUpdateOilChange, useDeleteOilChange, useUpdateMaintenanceRecord, useDeleteMaintenanceRecord, VehicleLog, OilChangeRecord, MaintenanceRecord } from '@/hooks/useVehicleLogs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Fuel, Gauge, Droplets, Plus, AlertTriangle, Calendar, Wrench, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FileUploadArea, { type UploadedFile } from '@/components/shared/FileUploadArea';
import { AttachmentItem } from '@/components/shared/AttachmentItem';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const DriverVehicleView = () => {
  const { data: currentDriver, isLoading: driverLoading } = useCurrentDriver();
  const { data: logs = [], isLoading: logsLoading } = useVehicleLogs();
  const { data: oilRecords = [] } = useOilChangeRecords();
  const { data: maintenanceRecords = [] } = useMaintenanceRecords();
  const createLog = useCreateVehicleLog();
  const createOilChange = useCreateOilChange();
  const createMaintenance = useCreateMaintenanceRecord();
  const updateLog = useUpdateVehicleLog();
  const deleteLog = useDeleteVehicleLog();
  const updateOil = useUpdateOilChange();
  const deleteOil = useDeleteOilChange();
  const updateMaint = useUpdateMaintenanceRecord();
  const deleteMaint = useDeleteMaintenanceRecord();

  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [oilDialogOpen, setOilDialogOpen] = useState(false);
  const [maintDialogOpen, setMaintDialogOpen] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterPlate, setFilterPlate] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [logFiles, setLogFiles] = useState<UploadedFile[]>([]);
  const [oilFiles, setOilFiles] = useState<UploadedFile[]>([]);
  const [maintFiles, setMaintFiles] = useState<UploadedFile[]>([]);

  // Edit states
  const [editingLog, setEditingLog] = useState<VehicleLog | null>(null);
  const [editLogForm, setEditLogForm] = useState<any>(null);
  const [editingOil, setEditingOil] = useState<OilChangeRecord | null>(null);
  const [editOilForm, setEditOilForm] = useState<any>(null);
  const [editingMaint, setEditingMaint] = useState<MaintenanceRecord | null>(null);
  const [editMaintForm, setEditMaintForm] = useState<any>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{type: 'log' | 'oil' | 'maint';id: string;} | null>(null);

  // Edit attachment states
  const [editLogAttachments, setEditLogAttachments] = useState<string[]>([]);
  const [editLogNewFiles, setEditLogNewFiles] = useState<UploadedFile[]>([]);
  const [editOilAttachments, setEditOilAttachments] = useState<string[]>([]);
  const [editOilNewFiles, setEditOilNewFiles] = useState<UploadedFile[]>([]);
  const [editMaintAttachments, setEditMaintAttachments] = useState<string[]>([]);
  const [editMaintNewFiles, setEditMaintNewFiles] = useState<UploadedFile[]>([]);

  // Helper to extract attachment paths from notes
  const extractAttachments = (notes: string | null): string[] => {
    if (!notes) return [];
    const match = notes.match(/\[anexos:([^\]]+)\]/);
    return match ? match[1].split(',').filter(Boolean) : [];
  };

  // Helper to build notes with attachments
  const buildNotesWithAttachments = (text: string, paths: string[]): string | null => {
    const clean = text.trim();
    if (!clean && !paths.length) return null;
    if (!paths.length) return clean || null;
    return clean ? `${clean}\n[anexos:${paths.join(',')}]` : `[anexos:${paths.join(',')}]`;
  };


  const uploadFiles = async (files: UploadedFile[], folder: string): Promise<string[]> => {
    const paths: string[] = [];
    for (const f of files) {
      const filePath = `${folder}/${Date.now()}_${f.file.name}`;
      const { error } = await supabase.storage.from('vehicle-attachments').upload(filePath, f.file);
      if (error) {
        console.error('Upload error', error);
        toast.error(`Erro ao enviar ${f.file.name}`);
      } else {
        paths.push(filePath);
      }
    }
    return paths;
  };

  // Get driver's vehicles
  const { data: driverVehicles = [] } = useQuery({
    queryKey: ['driver_vehicles', currentDriver?.id],
    enabled: !!currentDriver?.id,
    queryFn: async () => {
      const { data: dvt } = await supabase.
      from('driver_vehicle_types').
      select('vehicle_type').
      eq('driver_id', currentDriver!.id);

      if (!dvt?.length) return [];

      const types = dvt.map((d) => d.vehicle_type);
      const { data: vehicles } = await supabase.
      from('vehicles').
      select('*').
      in('type', types).
      eq('status', 'active');

      return vehicles || [];
    }
  });

  // Form states
  const [logForm, setLogForm] = useState({
    vehicle_id: '',
    plate: '',
    log_date: formatLocalDate(new Date()),
    km_atual: '',
    liters: '',
    fuel_price: '',
    fuel_type: 'diesel',
    notes: ''
  });

  const [oilForm, setOilForm] = useState({
    vehicle_id: '',
    plate: '',
    change_date: formatLocalDate(new Date()),
    km_at_change: '',
    next_change_km: '',
    oil_type: '',
    service_cost: '',
    notes: ''
  });

  const [maintForm, setMaintForm] = useState({
    vehicle_id: '',
    plate: '',
    maintenance_type: '',
    current_km: '',
    service_cost: '',
    notes: '',
    maintenance_date: formatLocalDate(new Date())
  });

  const totalCost = logForm.liters && logForm.fuel_price ?
  (parseFloat(logForm.liters) * parseFloat(logForm.fuel_price)).toFixed(2) :
  '0.00';

  const selectedMaintVehicle = driverVehicles.find((v: any) => v.id === maintForm.vehicle_id);

  const handleSubmitLog = async () => {
    if (!currentDriver?.id || !logForm.vehicle_id) return;
    const attachmentPaths = await uploadFiles(logFiles, `logs/${currentDriver.id}`);
    createLog.mutate({
      vehicle_id: logForm.vehicle_id,
      driver_id: currentDriver.id,
      log_date: logForm.log_date,
      km_initial: 0,
      km_final: parseFloat(logForm.km_atual) || 0,
      liters: logForm.liters ? parseFloat(logForm.liters) : undefined,
      fuel_price: logForm.fuel_price ? parseFloat(logForm.fuel_price) : undefined,
      total_cost: parseFloat(totalCost) || undefined,
      fuel_type: logForm.fuel_type,
      vehicle_plate: logForm.plate || undefined,
      notes: logForm.notes ? `${logForm.notes}${attachmentPaths.length ? `\n[anexos:${attachmentPaths.join(',')}]` : ''}` : attachmentPaths.length ? `[anexos:${attachmentPaths.join(',')}]` : undefined
    }, {
      onSuccess: () => {
        setLogDialogOpen(false);
        setLogForm({ vehicle_id: '', plate: '', log_date: formatLocalDate(new Date()), km_atual: '', liters: '', fuel_price: '', fuel_type: 'diesel', notes: '' });
        setLogFiles([]);
      }
    });
  };

  const handleSubmitOilChange = async () => {
    if (!currentDriver?.id || !oilForm.vehicle_id) return;
    const attachmentPaths = await uploadFiles(oilFiles, `oil/${currentDriver.id}`);
    createOilChange.mutate({
      vehicle_id: oilForm.vehicle_id,
      driver_id: currentDriver.id,
      change_date: oilForm.change_date,
      km_at_change: parseFloat(oilForm.km_at_change) || 0,
      next_change_km: parseFloat(oilForm.next_change_km) || 0,
      oil_type: oilForm.oil_type || undefined,
      service_cost: oilForm.service_cost ? parseFloat(oilForm.service_cost) : undefined,
      vehicle_plate: oilForm.plate || undefined,
      notes: oilForm.notes ? `${oilForm.notes}${attachmentPaths.length ? `\n[anexos:${attachmentPaths.join(',')}]` : ''}` : attachmentPaths.length ? `[anexos:${attachmentPaths.join(',')}]` : undefined
    }, {
      onSuccess: () => {
        setOilDialogOpen(false);
        setOilForm({ vehicle_id: '', plate: '', change_date: formatLocalDate(new Date()), km_at_change: '', next_change_km: '', oil_type: '', service_cost: '', notes: '' });
        setOilFiles([]);
      }
    });
  };

  const handleSubmitMaintenance = async () => {
    if (!currentDriver?.id || !maintForm.vehicle_id || !maintForm.maintenance_type) return;
    const attachmentPaths = await uploadFiles(maintFiles, `maintenance/${currentDriver.id}`);
    createMaintenance.mutate({
      vehicle_id: maintForm.vehicle_id,
      driver_id: currentDriver.id,
      maintenance_type: maintForm.maintenance_type,
      vehicle_plate: maintForm.plate || '',
      current_km: parseFloat(maintForm.current_km) || 0,
      service_cost: maintForm.service_cost ? parseFloat(maintForm.service_cost) : undefined,
      notes: maintForm.notes ? `${maintForm.notes}${attachmentPaths.length ? `\n[anexos:${attachmentPaths.join(',')}]` : ''}` : attachmentPaths.length ? `[anexos:${attachmentPaths.join(',')}]` : undefined,
      maintenance_date: maintForm.maintenance_date
    }, {
      onSuccess: () => {
        setMaintDialogOpen(false);
        setMaintForm({ vehicle_id: '', plate: '', maintenance_type: '', current_km: '', service_cost: '', notes: '', maintenance_date: formatLocalDate(new Date()) });
        setMaintFiles([]);
      }
    });
  };

  // Edit handlers
  const openEditLog = (log: VehicleLog) => {
    setEditLogForm({
      vehicle_id: log.vehicle_id,
      plate: log.vehicle_plate || '',
      log_date: log.log_date,
      km_atual: String(log.km_final || ''),
      liters: String(log.liters || ''),
      fuel_price: String(log.fuel_price || ''),
      fuel_type: log.fuel_type || 'diesel',
      notes: (log.notes || '').replace(/\n?\[anexos:[^\]]*\]/, '')
    });
    setEditLogAttachments(extractAttachments(log.notes));
    setEditLogNewFiles([]);
    setEditingLog(log);
  };

  const handleUpdateLog = async () => {
    if (!editingLog || !editLogForm || !currentDriver?.id) return;
    const newPaths = await uploadFiles(editLogNewFiles, `logs/${currentDriver.id}`);
    const allPaths = [...editLogAttachments, ...newPaths];
    const totalCostVal = editLogForm.liters && editLogForm.fuel_price ?
    parseFloat(editLogForm.liters) * parseFloat(editLogForm.fuel_price) :
    undefined;
    updateLog.mutate({
      id: editingLog.id,
      vehicle_id: editLogForm.vehicle_id,
      log_date: editLogForm.log_date,
      km_final: parseFloat(editLogForm.km_atual) || 0,
      liters: editLogForm.liters ? parseFloat(editLogForm.liters) : null,
      fuel_price: editLogForm.fuel_price ? parseFloat(editLogForm.fuel_price) : null,
      total_cost: totalCostVal || null,
      fuel_type: editLogForm.fuel_type,
      vehicle_plate: editLogForm.plate || null,
      notes: buildNotesWithAttachments(editLogForm.notes || '', allPaths)
    }, { onSuccess: () => setEditingLog(null) });
  };

  const openEditOil = (oil: OilChangeRecord) => {
    setEditOilForm({
      vehicle_id: oil.vehicle_id,
      plate: oil.vehicle_plate || '',
      change_date: oil.change_date,
      km_at_change: String(oil.km_at_change),
      next_change_km: String(oil.next_change_km),
      oil_type: oil.oil_type || '',
      service_cost: String(oil.service_cost || ''),
      notes: (oil.notes || '').replace(/\n?\[anexos:[^\]]*\]/, '')
    });
    setEditOilAttachments(extractAttachments(oil.notes));
    setEditOilNewFiles([]);
    setEditingOil(oil);
  };

  const handleUpdateOil = async () => {
    if (!editingOil || !editOilForm || !currentDriver?.id) return;
    const newPaths = await uploadFiles(editOilNewFiles, `oil/${currentDriver.id}`);
    const allPaths = [...editOilAttachments, ...newPaths];
    updateOil.mutate({
      id: editingOil.id,
      vehicle_id: editOilForm.vehicle_id,
      change_date: editOilForm.change_date,
      km_at_change: parseFloat(editOilForm.km_at_change) || 0,
      next_change_km: parseFloat(editOilForm.next_change_km) || 0,
      oil_type: editOilForm.oil_type || null,
      service_cost: editOilForm.service_cost ? parseFloat(editOilForm.service_cost) : null,
      vehicle_plate: editOilForm.plate || null,
      notes: buildNotesWithAttachments(editOilForm.notes || '', allPaths)
    }, { onSuccess: () => setEditingOil(null) });
  };

  const openEditMaint = (m: MaintenanceRecord) => {
    setEditMaintForm({
      vehicle_id: m.vehicle_id,
      plate: m.vehicle_plate || '',
      maintenance_type: m.maintenance_type,
      current_km: String(m.current_km),
      service_cost: String(m.service_cost || ''),
      notes: (m.notes || '').replace(/\n?\[anexos:[^\]]*\]/, ''),
      maintenance_date: m.maintenance_date
    });
    setEditMaintAttachments(extractAttachments(m.notes));
    setEditMaintNewFiles([]);
    setEditingMaint(m);
  };

  const handleUpdateMaint = async () => {
    if (!editingMaint || !editMaintForm || !currentDriver?.id) return;
    const newPaths = await uploadFiles(editMaintNewFiles, `maintenance/${currentDriver.id}`);
    const allPaths = [...editMaintAttachments, ...newPaths];
    updateMaint.mutate({
      id: editingMaint.id,
      vehicle_id: editMaintForm.vehicle_id,
      maintenance_type: editMaintForm.maintenance_type,
      vehicle_plate: editMaintForm.plate || '',
      current_km: parseFloat(editMaintForm.current_km) || 0,
      service_cost: editMaintForm.service_cost ? parseFloat(editMaintForm.service_cost) : null,
      notes: buildNotesWithAttachments(editMaintForm.notes || '', allPaths),
      maintenance_date: editMaintForm.maintenance_date
    }, { onSuccess: () => setEditingMaint(null) });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'log') deleteLog.mutate(deleteTarget.id);
    if (deleteTarget.type === 'oil') deleteOil.mutate(deleteTarget.id);
    if (deleteTarget.type === 'maint') deleteMaint.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };


  const vehicleTypes = [...new Set(driverVehicles.map((v: any) => v.type))];

  // Get unique plates from operational records (fuel logs, oil changes, maintenance)
  const filteredPlates = (() => {
    const typeFilteredIds = filterType === 'all' ?
    null :
    new Set(driverVehicles.filter((v: any) => v.type === filterType).map((v: any) => v.id));

    const plates = new Set<string>();
    logs.forEach((l) => {
      if (l.vehicle_plate && (!typeFilteredIds || typeFilteredIds.has(l.vehicle_id))) plates.add(l.vehicle_plate);
    });
    oilRecords.forEach((o) => {
      if (o.vehicle_plate && (!typeFilteredIds || typeFilteredIds.has(o.vehicle_id))) plates.add(o.vehicle_plate);
    });
    maintenanceRecords.forEach((m) => {
      if (m.vehicle_plate && (!typeFilteredIds || typeFilteredIds.has(m.vehicle_id))) plates.add(m.vehicle_plate);
    });
    return Array.from(plates).sort();
  })();

  // Filter helper
  const inDateRange = (dateStr: string) => {
    if (!filterStartDate && !filterEndDate) return true;
    const d = dateStr?.slice(0, 10);
    if (filterStartDate && d < filterStartDate) return false;
    if (filterEndDate && d > filterEndDate) return false;
    return true;
  };
  const matchesVehicle = (vehicleId: string, plate?: string | null) => {
    if (filterType !== 'all') {
      const veh = driverVehicles.find((v: any) => v.id === vehicleId);
      if (!veh || veh.type !== filterType) return false;
    }
    if (filterPlate !== 'all') {
      const actualPlate = plate || driverVehicles.find((v: any) => v.id === vehicleId)?.plate;
      if (actualPlate !== filterPlate) return false;
    }
    return true;
  };

  // Filtered data
  const filteredLogs = logs.filter((l) => matchesVehicle(l.vehicle_id, l.vehicle_plate) && inDateRange(l.log_date));
  const filteredOilRecords = oilRecords.filter((o) => matchesVehicle(o.vehicle_id, o.vehicle_plate) && inDateRange(o.change_date));
  const filteredMaintenanceRecords = maintenanceRecords.filter((m) => matchesVehicle(m.vehicle_id, m.vehicle_plate) && inDateRange(m.maintenance_date));

  // Stats (use filtered data)
  // Km Atual: último km informado (maior valor entre abastecimento, óleo e manutenção)
  const lastKmFromLogs = filteredLogs.length > 0 ? Math.max(...filteredLogs.map((l) => l.km_final || 0)) : 0;
  const lastKmFromOil = filteredOilRecords.length > 0 ? Math.max(...filteredOilRecords.map((o) => o.km_at_change || 0)) : 0;
  const lastKmFromMaint = filteredMaintenanceRecords.length > 0 ? Math.max(...filteredMaintenanceRecords.map((m) => m.current_km || 0)) : 0;
  const currentKm = Math.max(lastKmFromLogs, lastKmFromOil, lastKmFromMaint);
  const totalLiters = filteredLogs.reduce((acc, l) => acc + (l.liters || 0), 0);
  const fuelCost = filteredLogs.reduce((acc, l) => acc + (l.total_cost || 0), 0);
  const oilCost = filteredOilRecords.reduce((acc, o) => acc + (o.service_cost || 0), 0);
  const maintCost = filteredMaintenanceRecords.reduce((acc, m) => acc + (m.service_cost || 0), 0);
  const totalSpent = fuelCost + oilCost + maintCost;
  // Get latest oil record by change_date - respects active filters, falls back to all records only when no filters are active
  const oilSourceForCard = filteredOilRecords.length > 0 ?
  filteredOilRecords :
  filterType === 'all' && filterPlate === 'all' && !filterStartDate && !filterEndDate ?
  oilRecords :
  [];
  const latestOil = oilSourceForCard.length > 0 ?
  oilSourceForCard.reduce((latest, record) =>
  parseDateString(record.change_date) > parseDateString(latest.change_date) ? record : latest,
  oilSourceForCard[0]) :
  null;
  const oilChangeWarning = latestOil && currentKm >= latestOil.next_change_km;

  if (driverLoading || logsLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (!currentDriver) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum registro de motorista encontrado para sua conta.</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterType} onValueChange={(v) => {setFilterType(v);setFilterPlate('all');}}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {vehicleTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPlate} onValueChange={setFilterPlate}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas as placas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as placas</SelectItem>
            {filteredPlates.map((plate: string) => <SelectItem key={plate} value={plate}>{plate}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="w-[160px]" placeholder="Data inicial" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
        <Input type="date" className="w-[160px]" placeholder="Data final" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
      </div>
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-blue-500/10 p-2"><Gauge className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Km Atual</p>
              <p className="text-xl font-bold">{formatKmDisplay(currentKm)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-green-500/10 p-2"><Fuel className="h-5 w-5 text-green-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Litros Abastecidos</p>
              <p className="text-xl font-bold">{totalLiters.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-amber-500/10 p-2"><Droplets className="h-5 w-5 text-amber-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Gasto Total</p>
              <p className="text-xl font-bold">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={oilChangeWarning ? 'border-destructive' : ''}>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className={`rounded-lg p-2 ${oilChangeWarning ? 'bg-destructive/10' : 'bg-purple-500/10'}`}>
              {oilChangeWarning ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Calendar className="h-5 w-5 text-purple-500" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Próx. Troca Óleo</p>
              {latestOil ?
              <>
                  <p className="text-xl font-bold">{formatKmDisplay(latestOil.next_change_km)} km</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Km atual: {formatKmDisplay(currentKm)}</p>
                </> :

              <p className="text-sm text-muted-foreground">Sem registro</p>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {oilChangeWarning &&
      <div className="rounded-lg border border-destructive bg-destructive/5 p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-5 text-destructive shrink-0 h-[25px] border-0 mx-0" />
          <p className="text-destructive font-extrabold text-xl">Atenção: Km atual ({formatKmDisplay(currentKm)}) excedeu a previsão de troca de óleo ({formatKmDisplay(latestOil!.next_change_km)} km).</p>
        </div>
      }

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Registrar Abastecimento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registro de Km / Abastecimento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Veículo</Label>
                <Select value={logForm.vehicle_id} onValueChange={(v) => {setLogForm((p) => ({ ...p, vehicle_id: v, plate: '' }));}}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {driverVehicles.map((v: any) =>
                    <SelectItem key={v.id} value={v.id}>{v.type}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <PlateSelect
                vehicleType={driverVehicles.find((v: any) => v.id === logForm.vehicle_id)?.type || ''}
                value={logForm.plate}
                onChange={(plate) => setLogForm((p) => ({ ...p, plate }))}
              />
              <div>
                <Label>Data</Label>
                <Input type="date" value={logForm.log_date} onChange={(e) => setLogForm((p) => ({ ...p, log_date: e.target.value }))} />
              </div>
              <div>
                <Label>Km Atual</Label>
                <KmInput value={logForm.km_atual} onValueChange={(v) => setLogForm((p) => ({ ...p, km_atual: v }))} placeholder="Quilometragem atual" />
              </div>
              <div>
                <Label>Tipo de Combustível</Label>
                <Select value={logForm.fuel_type} onValueChange={(v) => setLogForm((p) => ({ ...p, fuel_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="alcool">Álcool</SelectItem>
                    <SelectItem value="gnv">Gás (GNV)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Litros</Label><Input type="number" step="0.01" value={logForm.liters} onChange={(e) => setLogForm((p) => ({ ...p, liters: e.target.value }))} /></div>
                <div><Label>Preço/Litro (R$)</Label><Input type="number" step="0.01" value={logForm.fuel_price} onChange={(e) => setLogForm((p) => ({ ...p, fuel_price: e.target.value }))} /></div>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-lg font-bold">R$ {totalCost}</p>
              </div>
              <div><Label>Observações</Label><Textarea value={logForm.notes} onChange={(e) => setLogForm((p) => ({ ...p, notes: e.target.value }))} /></div>
              <FileUploadArea files={logFiles} onFilesChange={setLogFiles} />
              <Button className="w-full" onClick={handleSubmitLog} disabled={createLog.isPending}>
                {createLog.isPending ? 'Salvando...' : 'Salvar Registro'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={oilDialogOpen} onOpenChange={setOilDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline"><Droplets className="mr-2 h-4 w-4" /> Registrar Troca de Óleo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Troca de Óleo</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Veículo</Label>
                <Select value={oilForm.vehicle_id} onValueChange={(v) => {setOilForm((p) => ({ ...p, vehicle_id: v, plate: '' }));}}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {driverVehicles.map((v: any) =>
                    <SelectItem key={v.id} value={v.id}>{v.type}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <PlateSelect
                vehicleType={driverVehicles.find((v: any) => v.id === oilForm.vehicle_id)?.type || ''}
                value={oilForm.plate}
                onChange={(plate) => setOilForm((p) => ({ ...p, plate }))}
              />
              <div><Label>Data da Troca</Label><Input type="date" value={oilForm.change_date} onChange={(e) => setOilForm((p) => ({ ...p, change_date: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Km na Troca</Label><KmInput value={oilForm.km_at_change} onValueChange={(v) => setOilForm((p) => ({ ...p, km_at_change: v }))} /></div>
                <div><Label>Próx. Troca (Km)</Label><KmInput value={oilForm.next_change_km} onValueChange={(v) => setOilForm((p) => ({ ...p, next_change_km: v }))} /></div>
              </div>
              <div><Label>Tipo de Óleo</Label><Input value={oilForm.oil_type} onChange={(e) => setOilForm((p) => ({ ...p, oil_type: e.target.value }))} /></div>
              <div><Label>Custo do Serviço (R$)</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={oilForm.service_cost} onChange={(e) => setOilForm((p) => ({ ...p, service_cost: e.target.value }))} /></div>
              <div><Label>Observações</Label><Textarea value={oilForm.notes} onChange={(e) => setOilForm((p) => ({ ...p, notes: e.target.value }))} /></div>
              <FileUploadArea files={oilFiles} onFilesChange={setOilFiles} />
              <Button className="w-full" onClick={handleSubmitOilChange} disabled={createOilChange.isPending}>
                {createOilChange.isPending ? 'Salvando...' : 'Registrar Troca'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={maintDialogOpen} onOpenChange={setMaintDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline"><Wrench className="mr-2 h-4 w-4" /> Registrar Manutenção</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registro de Manutenção</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo de Manutenção</Label>
                <Select value={maintForm.maintenance_type} onValueChange={(v) => setMaintForm((p) => ({ ...p, maintenance_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventiva">Preventiva</SelectItem>
                    <SelectItem value="corretiva">Corretiva</SelectItem>
                    <SelectItem value="preditiva">Preditiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Veículo</Label>
                <Select value={maintForm.vehicle_id} onValueChange={(v) => {setMaintForm((p) => ({ ...p, vehicle_id: v, plate: '' }));}}>
                  <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                  <SelectContent>
                    {driverVehicles.map((v: any) =>
                    <SelectItem key={v.id} value={v.id}>{v.type}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <PlateSelect
                vehicleType={driverVehicles.find((v: any) => v.id === maintForm.vehicle_id)?.type || ''}
                value={maintForm.plate}
                onChange={(plate) => setMaintForm((p) => ({ ...p, plate }))}
              />
              <div>
                <Label>Data</Label>
                <Input type="date" value={maintForm.maintenance_date} onChange={(e) => setMaintForm((p) => ({ ...p, maintenance_date: e.target.value }))} />
              </div>
              <div>
                <Label>Km Atual</Label>
                <KmInput value={maintForm.current_km} onValueChange={(v) => setMaintForm((p) => ({ ...p, current_km: v }))} placeholder="Quilometragem atual" />
              </div>
              <div>
                <Label>Custo do Serviço (R$)</Label>
                <Input type="number" step="0.01" value={maintForm.service_cost} onChange={(e) => setMaintForm((p) => ({ ...p, service_cost: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={maintForm.notes} onChange={(e) => setMaintForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Descreva o serviço realizado..." />
              </div>
              <FileUploadArea files={maintFiles} onFilesChange={setMaintFiles} />
              <Button className="w-full" onClick={handleSubmitMaintenance} disabled={createMaintenance.isPending}>
                {createMaintenance.isPending ? 'Salvando...' : 'Enviar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* History Table - Registros */}
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Registros</CardTitle></CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ?
          <p className="py-8 text-center text-muted-foreground">Nenhum registro encontrado.</p> :

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
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) =>
                <TableRow key={log.id}>
                      <TableCell>{format(parseDateString(log.log_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{log.vehicle?.type || '-'}</TableCell>
                      <TableCell>{log.vehicle_plate || log.vehicle?.plate || '-'}</TableCell>
                      <TableCell className="font-medium">{formatKmDisplay(log.km_final)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{log.fuel_type}</Badge>
                      </TableCell>
                      <TableCell>{log.liters?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '-'}</TableCell>
                      <TableCell>{log.fuel_price ? `R$ ${log.fuel_price.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="font-medium">{log.total_cost ? `R$ ${log.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditLog(log)}><Pencil className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      {/* History Table - Troca de Óleo */}
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Troca de Óleo</CardTitle></CardHeader>
        <CardContent>
          {filteredOilRecords.length === 0 ?
          <p className="py-8 text-center text-muted-foreground">Nenhum registro de troca de óleo encontrado.</p> :

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
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOilRecords.map((oil) =>
                <TableRow key={oil.id}>
                      <TableCell>{format(parseDateString(oil.change_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{oil.vehicle?.type || '-'}</TableCell>
                      <TableCell>{oil.vehicle_plate || oil.vehicle?.plate || '-'}</TableCell>
                      <TableCell className="font-medium">{formatKmDisplay(oil.km_at_change)}</TableCell>
                      <TableCell>{formatKmDisplay(oil.next_change_km)}</TableCell>
                      <TableCell>{oil.oil_type || '-'}</TableCell>
                      <TableCell className="font-medium">{oil.service_cost ? `R$ ${oil.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditOil(oil)}><Pencil className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      {/* History Table - Manutenção */}
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Manutenção</CardTitle></CardHeader>
        <CardContent>
          {filteredMaintenanceRecords.length === 0 ?
          <p className="py-8 text-center text-muted-foreground">Nenhum registro de manutenção encontrado.</p> :

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
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaintenanceRecords.map((m) =>
                <TableRow key={m.id}>
                      <TableCell>{format(parseDateString(m.maintenance_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{m.vehicle?.type || '-'}</TableCell>
                      <TableCell>{m.vehicle_plate || m.vehicle?.plate || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={m.maintenance_type === 'corretiva' ? 'destructive' : m.maintenance_type === 'preventiva' ? 'default' : 'secondary'}>
                          {m.maintenance_type === 'preventiva' ? 'Preventiva' : m.maintenance_type === 'corretiva' ? 'Corretiva' : m.maintenance_type === 'preditiva' ? 'Preditiva' : m.maintenance_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatKmDisplay(m.current_km)}</TableCell>
                      <TableCell className="font-medium">{m.service_cost ? `R$ ${m.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditMaint(m)}><Pencil className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      {/* Edit Log Dialog */}
      <Dialog open={!!editingLog} onOpenChange={(open) => !open && setEditingLog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Registro</DialogTitle></DialogHeader>
          {editLogForm &&
          <div className="space-y-4">
              <div>
                <Label>Veículo</Label>
                <Select value={editLogForm.vehicle_id} onValueChange={(v) => {const veh = driverVehicles.find((x: any) => x.id === v);setEditLogForm((p: any) => ({ ...p, vehicle_id: v, plate: veh?.plate || '' }));}}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {driverVehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <PlateSelect
                vehicleType={driverVehicles.find((v: any) => v.id === editLogForm.vehicle_id)?.type || ''}
                value={editLogForm.plate}
                onChange={(plate) => setEditLogForm((p: any) => ({ ...p, plate }))}
              />
              <div><Label>Data</Label><Input type="date" value={editLogForm.log_date} onChange={(e) => setEditLogForm((p: any) => ({ ...p, log_date: e.target.value }))} /></div>
              <div><Label>Km Atual</Label><KmInput value={editLogForm.km_atual} onValueChange={(v) => setEditLogForm((p: any) => ({ ...p, km_atual: v }))} /></div>
              <div>
                <Label>Tipo de Combustível</Label>
                <Select value={editLogForm.fuel_type} onValueChange={(v) => setEditLogForm((p: any) => ({ ...p, fuel_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="alcool">Álcool</SelectItem>
                    <SelectItem value="gnv">Gás (GNV)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Litros</Label><Input type="number" step="0.01" value={editLogForm.liters} onChange={(e) => setEditLogForm((p: any) => ({ ...p, liters: e.target.value }))} /></div>
                <div><Label>Preço/Litro (R$)</Label><Input type="number" step="0.01" value={editLogForm.fuel_price} onChange={(e) => setEditLogForm((p: any) => ({ ...p, fuel_price: e.target.value }))} /></div>
              </div>
              <div><Label>Observações</Label><Textarea value={editLogForm.notes} onChange={(e) => setEditLogForm((p: any) => ({ ...p, notes: e.target.value }))} /></div>
              {editLogAttachments.length > 0 &&
            <div>
                  <Label>Anexos existentes</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {editLogAttachments.map((path, i) =>
                <AttachmentItem key={path} path={path} index={i} bucket="vehicle-attachments" onRemove={() => setEditLogAttachments((prev) => prev.filter((_, idx) => idx !== i))} />
                )}
                  </div>
                </div>
            }
              <FileUploadArea files={editLogNewFiles} onFilesChange={setEditLogNewFiles} />
              <Button className="w-full" onClick={handleUpdateLog} disabled={updateLog.isPending}>{updateLog.isPending ? 'Salvando...' : 'Salvar Alterações'}</Button>
            </div>
          }
        </DialogContent>
      </Dialog>

      {/* Edit Oil Dialog */}
      <Dialog open={!!editingOil} onOpenChange={(open) => !open && setEditingOil(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Troca de Óleo</DialogTitle></DialogHeader>
          {editOilForm &&
          <div className="space-y-4">
              <div>
                <Label>Veículo</Label>
                <Select value={editOilForm.vehicle_id} onValueChange={(v) => {const veh = driverVehicles.find((x: any) => x.id === v);setEditOilForm((p: any) => ({ ...p, vehicle_id: v, plate: veh?.plate || '' }));}}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {driverVehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <PlateSelect
                vehicleType={driverVehicles.find((v: any) => v.id === editOilForm.vehicle_id)?.type || ''}
                value={editOilForm.plate}
                onChange={(plate) => setEditOilForm((p: any) => ({ ...p, plate }))}
              />
              <div><Label>Data da Troca</Label><Input type="date" value={editOilForm.change_date} onChange={(e) => setEditOilForm((p: any) => ({ ...p, change_date: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Km na Troca</Label><KmInput value={editOilForm.km_at_change} onValueChange={(v) => setEditOilForm((p: any) => ({ ...p, km_at_change: v }))} /></div>
                <div><Label>Próx. Troca (Km)</Label><KmInput value={editOilForm.next_change_km} onValueChange={(v) => setEditOilForm((p: any) => ({ ...p, next_change_km: v }))} /></div>
              </div>
              <div><Label>Tipo de Óleo</Label><Input value={editOilForm.oil_type} onChange={(e) => setEditOilForm((p: any) => ({ ...p, oil_type: e.target.value }))} /></div>
              <div><Label>Custo do Serviço (R$)</Label><Input type="number" step="0.01" value={editOilForm.service_cost} onChange={(e) => setEditOilForm((p: any) => ({ ...p, service_cost: e.target.value }))} /></div>
              <div><Label>Observações</Label><Textarea value={editOilForm.notes} onChange={(e) => setEditOilForm((p: any) => ({ ...p, notes: e.target.value }))} /></div>
              {editOilAttachments.length > 0 &&
            <div>
                  <Label>Anexos existentes</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {editOilAttachments.map((path, i) =>
                <AttachmentItem key={path} path={path} index={i} bucket="vehicle-attachments" onRemove={() => setEditOilAttachments((prev) => prev.filter((_, idx) => idx !== i))} />
                )}
                  </div>
                </div>
            }
              <FileUploadArea files={editOilNewFiles} onFilesChange={setEditOilNewFiles} />
              <Button className="w-full" onClick={handleUpdateOil} disabled={updateOil.isPending}>{updateOil.isPending ? 'Salvando...' : 'Salvar Alterações'}</Button>
            </div>
          }
        </DialogContent>
      </Dialog>

      {/* Edit Maintenance Dialog */}
      <Dialog open={!!editingMaint} onOpenChange={(open) => !open && setEditingMaint(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Manutenção</DialogTitle></DialogHeader>
          {editMaintForm &&
          <div className="space-y-4">
              <div>
                <Label>Tipo de Manutenção</Label>
                <Select value={editMaintForm.maintenance_type} onValueChange={(v) => setEditMaintForm((p: any) => ({ ...p, maintenance_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventiva">Preventiva</SelectItem>
                    <SelectItem value="corretiva">Corretiva</SelectItem>
                    <SelectItem value="preditiva">Preditiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Veículo</Label>
                <Select value={editMaintForm.vehicle_id} onValueChange={(v) => {const veh = driverVehicles.find((x: any) => x.id === v);setEditMaintForm((p: any) => ({ ...p, vehicle_id: v, plate: veh?.plate || '' }));}}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {driverVehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <PlateSelect
                vehicleType={driverVehicles.find((v: any) => v.id === editMaintForm.vehicle_id)?.type || ''}
                value={editMaintForm.plate}
                onChange={(plate) => setEditMaintForm((p: any) => ({ ...p, plate }))}
              />
              <div><Label>Data</Label><Input type="date" value={editMaintForm.maintenance_date} onChange={(e) => setEditMaintForm((p: any) => ({ ...p, maintenance_date: e.target.value }))} /></div>
              <div><Label>Km Atual</Label><KmInput value={editMaintForm.current_km} onValueChange={(v) => setEditMaintForm((p: any) => ({ ...p, current_km: v }))} /></div>
              <div><Label>Custo do Serviço (R$)</Label><Input type="number" step="0.01" value={editMaintForm.service_cost} onChange={(e) => setEditMaintForm((p: any) => ({ ...p, service_cost: e.target.value }))} /></div>
              <div><Label>Observações</Label><Textarea value={editMaintForm.notes} onChange={(e) => setEditMaintForm((p: any) => ({ ...p, notes: e.target.value }))} /></div>
              {editMaintAttachments.length > 0 &&
            <div>
                  <Label>Anexos existentes</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {editMaintAttachments.map((path, i) =>
                <AttachmentItem key={path} path={path} index={i} bucket="vehicle-attachments" onRemove={() => setEditMaintAttachments((prev) => prev.filter((_, idx) => idx !== i))} />
                )}
                  </div>
                </div>
            }
              <FileUploadArea files={editMaintNewFiles} onFilesChange={setEditMaintNewFiles} />
              <Button className="w-full" onClick={handleUpdateMaint} disabled={updateMaint.isPending}>{updateMaint.isPending ? 'Salvando...' : 'Salvar Alterações'}</Button>
            </div>
          }
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

};

export default DriverVehicleView;