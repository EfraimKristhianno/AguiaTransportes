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
import { useCurrentDriver } from '@/hooks/useDriverRequests';
import { useVehicleLogs, useOilChangeRecords, useMaintenanceRecords, useCreateVehicleLog, useCreateOilChange, useCreateMaintenanceRecord, VehicleLog } from '@/hooks/useVehicleLogs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Fuel, Gauge, Droplets, Plus, AlertTriangle, Calendar, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FileUploadArea, { type UploadedFile } from '@/components/shared/FileUploadArea';
import { toast } from 'sonner';

const DriverVehicleView = () => {
  const { data: currentDriver, isLoading: driverLoading } = useCurrentDriver();
  const { data: logs = [], isLoading: logsLoading } = useVehicleLogs();
  const { data: oilRecords = [] } = useOilChangeRecords();
  const { data: maintenanceRecords = [] } = useMaintenanceRecords();
  const createLog = useCreateVehicleLog();
  const createOilChange = useCreateOilChange();
  const createMaintenance = useCreateMaintenanceRecord();

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
      const { data: dvt } = await supabase
        .from('driver_vehicle_types')
        .select('vehicle_type')
        .eq('driver_id', currentDriver!.id);

      if (!dvt?.length) return [];

      const types = dvt.map(d => d.vehicle_type);
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('*')
        .in('type', types)
        .eq('status', 'active');

      return vehicles || [];
    },
  });

  // Form states
  const [logForm, setLogForm] = useState({
    vehicle_id: '',
    plate: '',
    log_date: new Date().toISOString().split('T')[0],
    km_atual: '',
    liters: '',
    fuel_price: '',
    fuel_type: 'diesel',
    notes: '',
  });

  const [oilForm, setOilForm] = useState({
    vehicle_id: '',
    plate: '',
    change_date: new Date().toISOString().split('T')[0],
    km_at_change: '',
    next_change_km: '',
    oil_type: '',
    service_cost: '',
    notes: '',
  });

  const [maintForm, setMaintForm] = useState({
    vehicle_id: '',
    plate: '',
    maintenance_type: '',
    current_km: '',
    service_cost: '',
    notes: '',
    maintenance_date: new Date().toISOString().split('T')[0],
  });

  const totalCost = logForm.liters && logForm.fuel_price
    ? (parseFloat(logForm.liters) * parseFloat(logForm.fuel_price)).toFixed(2)
    : '0.00';

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
      notes: logForm.notes ? `${logForm.notes}${attachmentPaths.length ? `\n[anexos:${attachmentPaths.join(',')}]` : ''}` : (attachmentPaths.length ? `[anexos:${attachmentPaths.join(',')}]` : undefined),
    }, {
      onSuccess: () => {
        setLogDialogOpen(false);
        setLogForm({ vehicle_id: '', plate: '', log_date: new Date().toISOString().split('T')[0], km_atual: '', liters: '', fuel_price: '', fuel_type: 'diesel', notes: '' });
        setLogFiles([]);
      },
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
      notes: oilForm.notes ? `${oilForm.notes}${attachmentPaths.length ? `\n[anexos:${attachmentPaths.join(',')}]` : ''}` : (attachmentPaths.length ? `[anexos:${attachmentPaths.join(',')}]` : undefined),
    }, {
      onSuccess: () => {
        setOilDialogOpen(false);
        setOilForm({ vehicle_id: '', plate: '', change_date: new Date().toISOString().split('T')[0], km_at_change: '', next_change_km: '', oil_type: '', service_cost: '', notes: '' });
        setOilFiles([]);
      },
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
      notes: maintForm.notes ? `${maintForm.notes}${attachmentPaths.length ? `\n[anexos:${attachmentPaths.join(',')}]` : ''}` : (attachmentPaths.length ? `[anexos:${attachmentPaths.join(',')}]` : undefined),
      maintenance_date: maintForm.maintenance_date,
    }, {
      onSuccess: () => {
        setMaintDialogOpen(false);
        setMaintForm({ vehicle_id: '', plate: '', maintenance_type: '', current_km: '', service_cost: '', notes: '', maintenance_date: new Date().toISOString().split('T')[0] });
        setMaintFiles([]);
      },
    });
  };

  // Derive filter options from driver's vehicles
  const vehicleTypes = [...new Set(driverVehicles.map((v: any) => v.type))];
  const filteredPlates = filterType === 'all'
    ? driverVehicles
    : driverVehicles.filter((v: any) => v.type === filterType);

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
  const filteredLogs = logs.filter(l => matchesVehicle(l.vehicle_id, l.vehicle_plate) && inDateRange(l.log_date));
  const filteredOilRecords = oilRecords.filter(o => matchesVehicle(o.vehicle_id, o.vehicle_plate) && inDateRange(o.change_date));
  const filteredMaintenanceRecords = maintenanceRecords.filter(m => matchesVehicle(m.vehicle_id, m.vehicle_plate) && inDateRange(m.maintenance_date));

  // Stats (use filtered data)
  // Km Atual: último km informado (maior valor entre abastecimento, óleo e manutenção)
  const lastKmFromLogs = filteredLogs.length > 0 ? Math.max(...filteredLogs.map(l => l.km_final || 0)) : 0;
  const lastKmFromOil = filteredOilRecords.length > 0 ? Math.max(...filteredOilRecords.map(o => o.km_at_change || 0)) : 0;
  const lastKmFromMaint = filteredMaintenanceRecords.length > 0 ? Math.max(...filteredMaintenanceRecords.map(m => m.current_km || 0)) : 0;
  const currentKm = Math.max(lastKmFromLogs, lastKmFromOil, lastKmFromMaint);
  const totalLiters = filteredLogs.reduce((acc, l) => acc + (l.liters || 0), 0);
  const fuelCost = filteredLogs.reduce((acc, l) => acc + (l.total_cost || 0), 0);
  const oilCost = filteredOilRecords.reduce((acc, o) => acc + (o.service_cost || 0), 0);
  const maintCost = filteredMaintenanceRecords.reduce((acc, m) => acc + (m.service_cost || 0), 0);
  const totalSpent = fuelCost + oilCost + maintCost;
  // Get latest oil record by change_date (most recent)
  const latestOil = filteredOilRecords.length > 0
    ? filteredOilRecords.reduce((latest, record) => 
        new Date(record.change_date) > new Date(latest.change_date) ? record : latest
      , filteredOilRecords[0])
    : oilRecords.length > 0
      ? oilRecords.reduce((latest, record) => 
          new Date(record.change_date) > new Date(latest.change_date) ? record : latest
        , oilRecords[0])
      : null;
  const lastLogKm = logs[0]?.km_final || 0;
  const oilChangeWarning = latestOil && lastLogKm >= latestOil.next_change_km;

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
        <Select value={filterType} onValueChange={v => { setFilterType(v); setFilterPlate('all'); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {vehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPlate} onValueChange={setFilterPlate}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas as placas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as placas</SelectItem>
            {filteredPlates.map((v: any) => <SelectItem key={v.id} value={v.plate}>{v.plate}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="w-[160px]" placeholder="Data inicial" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
        <Input type="date" className="w-[160px]" placeholder="Data final" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
      </div>
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-blue-500/10 p-2"><Gauge className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Km Atual</p>
              <p className="text-xl font-bold">{currentKm.toLocaleString('pt-BR')}</p>
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
              {latestOil ? (
                <p className="text-xl font-bold">{latestOil.next_change_km.toLocaleString('pt-BR')} km</p>
              ) : (
                <p className="text-sm text-muted-foreground">Sem registro</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {oilChangeWarning && (
        <div className="rounded-lg border border-destructive bg-destructive/5 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">Atenção: Km atual ({lastLogKm.toLocaleString('pt-BR')}) excedeu a previsão de troca de óleo ({latestOil!.next_change_km.toLocaleString('pt-BR')} km).</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Registro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registro de Km / Abastecimento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Veículo</Label>
                <Select value={logForm.vehicle_id} onValueChange={v => { const veh = driverVehicles.find((x: any) => x.id === v); setLogForm(p => ({ ...p, vehicle_id: v, plate: veh?.plate || '' })); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {driverVehicles.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>{v.type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Placa</Label>
                <Input value={logForm.plate} onChange={e => setLogForm(p => ({ ...p, plate: e.target.value }))} placeholder="Digite a placa" />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={logForm.log_date} onChange={e => setLogForm(p => ({ ...p, log_date: e.target.value }))} />
              </div>
              <div>
                <Label>Km Atual</Label>
                <Input type="number" value={logForm.km_atual} onChange={e => setLogForm(p => ({ ...p, km_atual: e.target.value }))} placeholder="Quilometragem atual" />
              </div>
              <div>
                <Label>Tipo de Combustível</Label>
                <Select value={logForm.fuel_type} onValueChange={v => setLogForm(p => ({ ...p, fuel_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="gnv">Gás (GNV)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Litros</Label><Input type="number" step="0.01" value={logForm.liters} onChange={e => setLogForm(p => ({ ...p, liters: e.target.value }))} /></div>
                <div><Label>Preço/Litro (R$)</Label><Input type="number" step="0.01" value={logForm.fuel_price} onChange={e => setLogForm(p => ({ ...p, fuel_price: e.target.value }))} /></div>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-lg font-bold">R$ {totalCost}</p>
              </div>
              <div><Label>Observações</Label><Textarea value={logForm.notes} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))} /></div>
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
                <Select value={oilForm.vehicle_id} onValueChange={v => { const veh = driverVehicles.find((x: any) => x.id === v); setOilForm(p => ({ ...p, vehicle_id: v, plate: veh?.plate || '' })); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {driverVehicles.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>{v.type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Placa</Label>
                <Input value={oilForm.plate} onChange={e => setOilForm(p => ({ ...p, plate: e.target.value }))} placeholder="Digite a placa" />
              </div>
              <div><Label>Data da Troca</Label><Input type="date" value={oilForm.change_date} onChange={e => setOilForm(p => ({ ...p, change_date: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Km na Troca</Label><Input type="number" value={oilForm.km_at_change} onChange={e => setOilForm(p => ({ ...p, km_at_change: e.target.value }))} /></div>
                <div><Label>Próx. Troca (Km)</Label><Input type="number" value={oilForm.next_change_km} onChange={e => setOilForm(p => ({ ...p, next_change_km: e.target.value }))} /></div>
              </div>
              <div><Label>Tipo de Óleo</Label><Input value={oilForm.oil_type} onChange={e => setOilForm(p => ({ ...p, oil_type: e.target.value }))} /></div>
              <div><Label>Custo do Serviço (R$)</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={oilForm.service_cost} onChange={e => setOilForm(p => ({ ...p, service_cost: e.target.value }))} /></div>
              <div><Label>Observações</Label><Textarea value={oilForm.notes} onChange={e => setOilForm(p => ({ ...p, notes: e.target.value }))} /></div>
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
                <Select value={maintForm.maintenance_type} onValueChange={v => setMaintForm(p => ({ ...p, maintenance_type: v }))}>
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
                <Select value={maintForm.vehicle_id} onValueChange={v => { const veh = driverVehicles.find((x: any) => x.id === v); setMaintForm(p => ({ ...p, vehicle_id: v, plate: veh?.plate || '' })); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                  <SelectContent>
                    {driverVehicles.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>{v.type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Placa</Label>
                <Input value={maintForm.plate} onChange={e => setMaintForm(p => ({ ...p, plate: e.target.value }))} placeholder="Digite a placa" />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={maintForm.maintenance_date} onChange={e => setMaintForm(p => ({ ...p, maintenance_date: e.target.value }))} />
              </div>
              <div>
                <Label>Km Atual</Label>
                <Input type="number" value={maintForm.current_km} onChange={e => setMaintForm(p => ({ ...p, current_km: e.target.value }))} placeholder="Quilometragem atual" />
              </div>
              <div>
                <Label>Custo do Serviço (R$)</Label>
                <Input type="number" step="0.01" value={maintForm.service_cost} onChange={e => setMaintForm(p => ({ ...p, service_cost: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={maintForm.notes} onChange={e => setMaintForm(p => ({ ...p, notes: e.target.value }))} placeholder="Descreva o serviço realizado..." />
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
          {filteredLogs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum registro encontrado.</p>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.log_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{log.vehicle?.type || '-'}</TableCell>
                      <TableCell>{log.vehicle_plate || log.vehicle?.plate || '-'}</TableCell>
                      <TableCell className="font-medium">{log.km_final?.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{log.fuel_type}</Badge>
                      </TableCell>
                      <TableCell>{log.liters?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '-'}</TableCell>
                      <TableCell>{log.fuel_price ? `R$ ${log.fuel_price.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="font-medium">{log.total_cost ? `R$ ${log.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Table - Troca de Óleo */}
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Troca de Óleo</CardTitle></CardHeader>
        <CardContent>
          {filteredOilRecords.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum registro de troca de óleo encontrado.</p>
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
                    <TableHead>Obs.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOilRecords.map((oil) => (
                    <TableRow key={oil.id}>
                      <TableCell>{format(new Date(oil.change_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{oil.vehicle?.type || '-'}</TableCell>
                      <TableCell>{oil.vehicle_plate || oil.vehicle?.plate || '-'}</TableCell>
                      <TableCell className="font-medium">{oil.km_at_change.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{oil.next_change_km.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{oil.oil_type || '-'}</TableCell>
                      <TableCell className="font-medium">{oil.service_cost ? `R$ ${oil.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{oil.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Table - Manutenção */}
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Manutenção</CardTitle></CardHeader>
        <CardContent>
          {filteredMaintenanceRecords.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum registro de manutenção encontrado.</p>
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
                    <TableHead>Obs.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaintenanceRecords.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{format(new Date(m.maintenance_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{m.vehicle?.type || '-'}</TableCell>
                      <TableCell>{m.vehicle_plate || m.vehicle?.plate || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={m.maintenance_type === 'corretiva' ? 'destructive' : m.maintenance_type === 'preventiva' ? 'default' : 'secondary'}>
                          {m.maintenance_type === 'preventiva' ? 'Preventiva' : m.maintenance_type === 'corretiva' ? 'Corretiva' : m.maintenance_type === 'preditiva' ? 'Preditiva' : m.maintenance_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{m.current_km.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="font-medium">{m.service_cost ? `R$ ${m.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{m.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverVehicleView;
