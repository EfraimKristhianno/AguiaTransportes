import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVehicleLogs, useOilChangeRecords, useMaintenanceRecords } from '@/hooks/useVehicleLogs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Fuel, Gauge, Droplets, Car, AlertTriangle, TrendingUp, DollarSign, History, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import VehicleHistoryDialog from './VehicleHistoryDialog';
import VehicleExportPDF from './VehicleExportPDF';

const COLORS = ['#d32127', '#e8783a', '#f5a623', '#4a9eda', '#6bc5a0'];

const getVehiclePrefix = (type: string) => {
  if (!type) return 'N/A';
  // Extract just the main name: "Caminhão (3/4)" -> "Caminhão (3/4)", "Moto" -> "Moto"
  return type;
};

const AdminVehicleView = () => {
  const { data: logs = [], isLoading } = useVehicleLogs();
  const { data: oilRecords = [] } = useOilChangeRecords();
  const { data: maintenanceRecords = [] } = useMaintenanceRecords();
  const [selectedVehicle, setSelectedVehicle] = useState<{ id: string; plate: string } | null>(null);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');
  const [plateSearch, setPlateSearch] = useState('');

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['all_vehicles'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('*');
      return data || [];
    },
  });

  const { data: allDrivers = [] } = useQuery({
    queryKey: ['all_drivers_admin'],
    queryFn: async () => {
      const { data } = await supabase.from('drivers').select('*');
      return data || [];
    },
  });

  // Unique vehicle types for filter
  const vehicleTypes = useMemo(() => {
    const types = new Set(allVehicles.map((v: any) => v.type));
    return Array.from(types).sort();
  }, [allVehicles]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return allVehicles.filter((v: any) => {
      const matchType = vehicleTypeFilter === 'all' || v.type === vehicleTypeFilter;
      if (!plateSearch) return matchType;
      const search = plateSearch.toLowerCase();
      // Search in vehicle plate AND in record plates (vehicle_plate from logs, oil, maintenance)
      const matchVehiclePlate = v.plate?.toLowerCase().includes(search);
      const matchLogPlate = logs.some(l => l.vehicle_id === v.id && l.vehicle_plate?.toLowerCase().includes(search));
      const matchOilPlate = oilRecords.some(o => o.vehicle_id === v.id && o.vehicle_plate?.toLowerCase().includes(search));
      const matchMaintPlate = maintenanceRecords.some(m => m.vehicle_id === v.id && m.vehicle_plate?.toLowerCase().includes(search));
      return matchType && (matchVehiclePlate || matchLogPlate || matchOilPlate || matchMaintPlate);
    });
  }, [allVehicles, vehicleTypeFilter, plateSearch, logs, oilRecords, maintenanceRecords]);

  // Filtered logs based on filtered vehicles
  const filteredLogs = useMemo(() => {
    const vehicleIds = new Set(filteredVehicles.map((v: any) => v.id));
    return logs.filter(l => vehicleIds.has(l.vehicle_id));
  }, [logs, filteredVehicles]);

  // Global stats (filtered)
  const totalKm = filteredLogs.reduce((a, l) => a + (l.km_total || 0), 0);
  const totalLiters = filteredLogs.reduce((a, l) => a + (l.liters || 0), 0);
  const totalCost = filteredLogs.reduce((a, l) => a + (l.total_cost || 0), 0);
  const avgKmPerLiter = totalLiters > 0 ? totalKm / totalLiters : 0;
  const activeVehicles = filteredVehicles.filter((v: any) => v.status === 'active').length;
  const inactiveVehicles = filteredVehicles.length - activeVehicles;

  // Vehicle stats (filtered)
  const vehicleStats = filteredVehicles.map((v: any) => {
    const vLogs = logs.filter(l => l.vehicle_id === v.id);
    const vOil = oilRecords.filter(o => o.vehicle_id === v.id);
    const totalKm = vLogs.reduce((a, l) => a + (l.km_total || 0), 0);
    const totalLiters = vLogs.reduce((a, l) => a + (l.liters || 0), 0);
    const totalCost = vLogs.reduce((a, l) => a + (l.total_cost || 0), 0);
    const latestOil = vOil[0];
    const lastKm = vLogs[0]?.km_final || 0;
    const oilWarning = latestOil ? lastKm >= latestOil.next_change_km : false;
    const maintCount = maintenanceRecords.filter(m => m.vehicle_id === v.id).length;
    const maintCost = maintenanceRecords.filter(m => m.vehicle_id === v.id).reduce((a, m) => a + (m.service_cost || 0), 0);
    return { ...v, totalKm, totalLiters, totalCost, latestOil, oilWarning, lastKm, maintCount, maintCost };
  });

  const vehiclesWithWarning = vehicleStats.filter(v => v.oilWarning).length;

  // Cost per driver over time (parallel lines chart)
  const last30 = subDays(new Date(), 30);
  const driverDailyCosts: Record<string, Record<string, number>> = {};
  const allDatesSet = new Set<string>();
  
  filteredLogs.forEach(l => {
    const d = l.log_date;
    if (new Date(d) >= last30) {
      const driver = allDrivers.find((dr: any) => dr.id === l.driver_id);
      const driverName = driver?.name?.split(' ')[0] || 'N/A';
      if (!driverDailyCosts[driverName]) driverDailyCosts[driverName] = {};
      driverDailyCosts[driverName][d] = (driverDailyCosts[driverName][d] || 0) + (l.total_cost || 0);
      allDatesSet.add(d);
    }
  });

  const allDates = Array.from(allDatesSet).sort();
  const driverNames = Object.keys(driverDailyCosts);
  const driverLineData = allDates.map(date => {
    const entry: any = { date: format(parseISO(date), 'dd/MM') };
    driverNames.forEach(name => {
      entry[name] = driverDailyCosts[name][date] || 0;
    });
    return entry;
  });

  // Km per vehicle - horizontal bars with type prefix only
  const kmChartData = vehicleStats
    .filter(v => v.totalKm > 0)
    .map(v => ({ name: getVehiclePrefix(v.type), km: v.totalKm }));

  // Fuel type over time (vertical bars)
  const fuelDailyData: Record<string, Record<string, number>> = {};
  const fuelDatesSet = new Set<string>();
  const fuelTypesSet = new Set<string>();
  filteredLogs.forEach(l => {
    const d = l.log_date;
    if (new Date(d) >= last30) {
      fuelDatesSet.add(d);
      fuelTypesSet.add(l.fuel_type);
      if (!fuelDailyData[d]) fuelDailyData[d] = {};
      fuelDailyData[d][l.fuel_type] = (fuelDailyData[d][l.fuel_type] || 0) + 1;
    }
  });
  const fuelDates = Array.from(fuelDatesSet).sort();
  const fuelTypes = Array.from(fuelTypesSet);
  const fuelTimeData = fuelDates.map(date => {
    const entry: any = { date: format(parseISO(date), 'dd/MM') };
    fuelTypes.forEach(ft => { entry[ft] = fuelDailyData[date]?.[ft] || 0; });
    return entry;
  });

  // Maintenance cost by type
  const filteredVehicleIds = new Set(filteredVehicles.map((v: any) => v.id));
  const maintTypeCosts: Record<string, number> = {};
  maintenanceRecords
    .filter(m => filteredVehicleIds.has(m.vehicle_id))
    .forEach(m => {
      maintTypeCosts[m.maintenance_type] = (maintTypeCosts[m.maintenance_type] || 0) + (m.service_cost || 0);
    });
  const maintTypeData = Object.entries(maintTypeCosts)
    .map(([name, cost]) => ({ name, cost }))
    .sort((a, b) => b.cost - a.cost);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Tipo de veículo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {vehicleTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative w-full sm:w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa..."
            value={plateSearch}
            onChange={(e) => setPlateSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <div className="rounded-lg bg-blue-500/10 p-2"><Car className="h-5 w-5 text-blue-500" /></div>
          <div><p className="text-xs text-muted-foreground">Veículos</p><p className="text-xl font-bold">{filteredVehicles.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <div className="rounded-lg bg-amber-500/10 p-2"><Fuel className="h-5 w-5 text-amber-500" /></div>
          <div><p className="text-xs text-muted-foreground">Litros</p><p className="text-xl font-bold">{totalLiters.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <div className="rounded-lg bg-red-500/10 p-2"><DollarSign className="h-5 w-5 text-red-500" /></div>
          <div><p className="text-xs text-muted-foreground">Gasto Total</p><p className="text-xl font-bold">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <div className="rounded-lg bg-cyan-500/10 p-2"><TrendingUp className="h-5 w-5 text-cyan-500" /></div>
          <div><p className="text-xs text-muted-foreground">Média Km/L</p><p className="text-xl font-bold">{avgKmPerLiter.toFixed(1)}</p></div>
        </CardContent></Card>
        <Card className={vehiclesWithWarning > 0 ? 'border-destructive' : ''}>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className={`rounded-lg p-2 ${vehiclesWithWarning > 0 ? 'bg-destructive/10' : 'bg-purple-500/10'}`}>
              <AlertTriangle className={`h-5 w-5 ${vehiclesWithWarning > 0 ? 'text-destructive' : 'text-purple-500'}`} />
            </div>
            <div><p className="text-xs text-muted-foreground">Alertas Óleo</p><p className="text-xl font-bold">{vehiclesWithWarning}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Gasto por Veículo - Vertical bars */}
      <Card>
        <CardHeader><CardTitle className="text-base">Gasto por Veículo (30 dias)</CardTitle></CardHeader>
        <CardContent>
          {(() => {
            const vehicleCosts: Record<string, number> = {};
            filteredLogs.forEach(l => {
              if (new Date(l.log_date) >= last30) {
                const vehicle = allVehicles.find((v: any) => v.id === l.vehicle_id);
                const vehicleName = vehicle ? getVehiclePrefix(vehicle.type) : 'N/A';
                vehicleCosts[vehicleName] = (vehicleCosts[vehicleName] || 0) + (l.total_cost || 0);
              }
            });
            const vehicleCostData = Object.entries(vehicleCosts)
              .map(([name, cost]) => ({ name, cost }))
              .sort((a, b) => b.cost - a.cost);
            
            return vehicleCostData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={vehicleCostData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v: number) => `R$ ${v}`} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {vehicleCostData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">Sem dados nos últimos 30 dias</p>
            );
          })()}
        </CardContent>
      </Card>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Km por Veículo</CardTitle></CardHeader>
          <CardContent>
            {kmChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={kmChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                  <Tooltip />
                  <Bar dataKey="km" fill="#d32127" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="py-12 text-center text-muted-foreground">Sem dados</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Combustível ao Longo do Tempo</CardTitle></CardHeader>
          <CardContent>
            {fuelTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={fuelTimeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  {fuelTypes.map((ft, i) => (
                    <Bar key={ft} dataKey={ft} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="py-12 text-center text-muted-foreground">Sem dados</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Gastos por Tipo de Manutenção</CardTitle></CardHeader>
          <CardContent>
            {maintTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={maintTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tickFormatter={(v: number) => `R$ ${v}`} />
                  <YAxis dataKey="name" type="category" className="text-xs" width={120} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                    {maintTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="py-12 text-center text-muted-foreground">Sem dados</p>}
          </CardContent>
        </Card>
      </div>

      {/* Full Vehicle Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Painel Completo de Veículos</CardTitle>
          <VehicleExportPDF vehicles={allVehicles} logs={logs} oilRecords={oilRecords} maintenanceRecords={maintenanceRecords} />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Km Total</TableHead>
                  <TableHead>Gasto Comb.</TableHead>
                  <TableHead>Manutenções</TableHead>
                  <TableHead>Gasto Manut.</TableHead>
                  <TableHead>Óleo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleStats.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.type}</TableCell>
                    <TableCell><Badge variant={v.status === 'active' ? 'default' : 'secondary'}>{v.status === 'active' ? 'Ativo' : v.status === 'maintenance' ? 'Manutenção' : 'Inativo'}</Badge></TableCell>
                    <TableCell>{v.totalKm.toLocaleString('pt-BR')}</TableCell>
                    <TableCell>R$ {v.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{v.maintCount}</TableCell>
                    <TableCell>R$ {v.maintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      {v.oilWarning ? <Badge variant="destructive">Trocar</Badge> : v.latestOil ? <Badge variant="outline">OK</Badge> : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedVehicle({ id: v.id, plate: v.plate })}>
                        <History className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedVehicle && (
        <VehicleHistoryDialog
          open={!!selectedVehicle}
          onOpenChange={(open) => !open && setSelectedVehicle(null)}
          vehicleId={selectedVehicle.id}
          vehiclePlate={selectedVehicle.plate}
          logs={logs}
          oilRecords={oilRecords}
          maintenanceRecords={maintenanceRecords}
        />
      )}
    </div>
  );
};

export default AdminVehicleView;
