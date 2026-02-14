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
    km_initial: '',
    km_final: '',
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

  const handleSubmitLog = () => {
    if (!currentDriver?.id || !logForm.vehicle_id) return;
    createLog.mutate({
      vehicle_id: logForm.vehicle_id,
      driver_id: currentDriver.id,
      log_date: logForm.log_date,
      km_initial: parseFloat(logForm.km_initial) || 0,
      km_final: parseFloat(logForm.km_final) || 0,
      liters: logForm.liters ? parseFloat(logForm.liters) : undefined,
      fuel_price: logForm.fuel_price ? parseFloat(logForm.fuel_price) : undefined,
      total_cost: parseFloat(totalCost) || undefined,
      fuel_type: logForm.fuel_type,
      notes: logForm.notes || undefined,
    }, {
      onSuccess: () => {
        setLogDialogOpen(false);
        setLogForm({ vehicle_id: '', plate: '', log_date: new Date().toISOString().split('T')[0], km_initial: '', km_final: '', liters: '', fuel_price: '', fuel_type: 'diesel', notes: '' });
      },
    });
  };

  const handleSubmitOilChange = () => {
    if (!currentDriver?.id || !oilForm.vehicle_id) return;
    createOilChange.mutate({
      vehicle_id: oilForm.vehicle_id,
      driver_id: currentDriver.id,
      change_date: oilForm.change_date,
      km_at_change: parseFloat(oilForm.km_at_change) || 0,
      next_change_km: parseFloat(oilForm.next_change_km) || 0,
      oil_type: oilForm.oil_type || undefined,
      notes: oilForm.notes || undefined,
    }, {
      onSuccess: () => {
        setOilDialogOpen(false);
        setOilForm({ vehicle_id: '', plate: '', change_date: new Date().toISOString().split('T')[0], km_at_change: '', next_change_km: '', oil_type: '', notes: '' });
      },
    });
  };

  const handleSubmitMaintenance = () => {
    if (!currentDriver?.id || !maintForm.vehicle_id || !maintForm.maintenance_type) return;
    createMaintenance.mutate({
      vehicle_id: maintForm.vehicle_id,
      driver_id: currentDriver.id,
      maintenance_type: maintForm.maintenance_type,
      vehicle_plate: maintForm.plate || '',
      current_km: parseFloat(maintForm.current_km) || 0,
      service_cost: maintForm.service_cost ? parseFloat(maintForm.service_cost) : undefined,
      notes: maintForm.notes || undefined,
      maintenance_date: maintForm.maintenance_date,
    }, {
      onSuccess: () => {
        setMaintDialogOpen(false);
        setMaintForm({ vehicle_id: '', plate: '', maintenance_type: '', current_km: '', service_cost: '', notes: '', maintenance_date: new Date().toISOString().split('T')[0] });
      },
    });
  };

  // Stats
  const totalKm = logs.reduce((acc, l) => acc + (l.km_total || 0), 0);
  const totalLiters = logs.reduce((acc, l) => acc + (l.liters || 0), 0);
  const totalSpent = logs.reduce((acc, l) => acc + (l.total_cost || 0), 0);
  const latestOil = oilRecords[0];
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
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-blue-500/10 p-2"><Gauge className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Km Total</p>
              <p className="text-xl font-bold">{totalKm.toLocaleString('pt-BR')}</p>
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
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Km Inicial</Label><Input type="number" value={logForm.km_initial} onChange={e => setLogForm(p => ({ ...p, km_initial: e.target.value }))} /></div>
                <div><Label>Km Final</Label><Input type="number" value={logForm.km_final} onChange={e => setLogForm(p => ({ ...p, km_final: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Tipo de Combustível</Label>
                <Select value={logForm.fuel_type} onValueChange={v => setLogForm(p => ({ ...p, fuel_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="alcool">Álcool</SelectItem>
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
          <DialogContent>
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
              <div><Label>Observações</Label><Textarea value={oilForm.notes} onChange={e => setOilForm(p => ({ ...p, notes: e.target.value }))} /></div>
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
              <Button className="w-full" onClick={handleSubmitMaintenance} disabled={createMaintenance.isPending}>
                {createMaintenance.isPending ? 'Salvando...' : 'Enviar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Registros</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum registro encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Km Inicial</TableHead>
                    <TableHead>Km Final</TableHead>
                    <TableHead>Km Total</TableHead>
                    <TableHead>Combustível</TableHead>
                    <TableHead>Litros</TableHead>
                    <TableHead>R$/L</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.log_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{log.vehicle?.plate || '-'}</TableCell>
                      <TableCell>{log.km_initial?.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{log.km_final?.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="font-medium">{log.km_total?.toLocaleString('pt-BR')}</TableCell>
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
    </div>
  );
};

export default DriverVehicleView;
