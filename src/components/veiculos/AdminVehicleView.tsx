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
import { Fuel, Car, AlertTriangle, TrendingUp, DollarSign, History, Search, CalendarIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line, PieChart, Pie } from 'recharts';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
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
  const [plateFilter, setPlateFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

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

  // Fetch delivery requests with vehicle and freight price info
  const { data: deliveryRequests = [] } = useQuery({
    queryKey: ['delivery_requests_freight'],
    queryFn: async () => {
      const { data } = await supabase
        .from('delivery_requests')
        .select('id, vehicle_id, client_id, transport_type, region, status');
      return data || [];
    },
  });

  const { data: freightPrices = [] } = useQuery({
    queryKey: ['all_freight_prices_admin'],
    queryFn: async () => {
      const { data } = await supabase.from('freight_prices').select('*');
      return data || [];
    },
  });

  // Unique plates from operational records, filtered by selected vehicle type
  const uniquePlates = useMemo(() => {
    // Build a set of vehicle IDs that match the selected type
    const typeFilteredIds = vehicleTypeFilter === 'all'
      ? null
      : new Set(allVehicles.filter((v: any) => v.type === vehicleTypeFilter).map((v: any) => v.id));

    const plates = new Set<string>();
    logs.forEach(l => {
      if (l.vehicle_plate && (!typeFilteredIds || typeFilteredIds.has(l.vehicle_id))) plates.add(l.vehicle_plate);
    });
    oilRecords.forEach(o => {
      if (o.vehicle_plate && (!typeFilteredIds || typeFilteredIds.has(o.vehicle_id))) plates.add(o.vehicle_plate);
    });
    maintenanceRecords.forEach(m => {
      if (m.vehicle_plate && (!typeFilteredIds || typeFilteredIds.has(m.vehicle_id))) plates.add(m.vehicle_plate);
    });
    return Array.from(plates).sort();
  }, [logs, oilRecords, maintenanceRecords, vehicleTypeFilter, allVehicles]);

  // Unique vehicle types for filter
  const vehicleTypes = useMemo(() => {
    const types = new Set(allVehicles.map((v: any) => v.type));
    return Array.from(types).sort();
  }, [allVehicles]);

  // Get vehicle IDs that match the selected plate
  const plateMatchedVehicleIds = useMemo(() => {
    if (plateFilter === 'all') return null; // null means no plate filter
    const ids = new Set<string>();
    logs.forEach(l => { if (l.vehicle_plate === plateFilter) ids.add(l.vehicle_id); });
    oilRecords.forEach(o => { if (o.vehicle_plate === plateFilter) ids.add(o.vehicle_id); });
    maintenanceRecords.forEach(m => { if (m.vehicle_plate === plateFilter) ids.add(m.vehicle_id); });
    return ids;
  }, [plateFilter, logs, oilRecords, maintenanceRecords]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return allVehicles.filter((v: any) => {
      const matchType = vehicleTypeFilter === 'all' || v.type === vehicleTypeFilter;
      const matchPlate = !plateMatchedVehicleIds || plateMatchedVehicleIds.has(v.id);
      return matchType && matchPlate;
    });
  }, [allVehicles, vehicleTypeFilter, plateMatchedVehicleIds]);

  // Helper to check if a date string is within the selected range
  const isInDateRange = (dateStr: string) => {
    if (!startDate && !endDate) return true;
    const d = new Date(dateStr);
    if (startDate && d < startOfDay(startDate)) return false;
    if (endDate && d > endOfDay(endDate)) return false;
    return true;
  };

  const filteredVehicleIdsSetAll = useMemo(() => new Set(filteredVehicles.map((v: any) => v.id)), [filteredVehicles]);

  // Filtered logs based on filtered vehicles, date range AND plate filter
  const filteredLogs = useMemo(() => {
    return logs.filter(l => filteredVehicleIdsSetAll.has(l.vehicle_id) && isInDateRange(l.log_date) && (plateFilter === 'all' || l.vehicle_plate === plateFilter));
  }, [logs, filteredVehicleIdsSetAll, startDate, endDate, plateFilter]);

  // Filtered oil records based on filtered vehicles, date range AND plate filter
  const filteredOilRecords = useMemo(() => {
    return oilRecords.filter(o => filteredVehicleIdsSetAll.has(o.vehicle_id) && isInDateRange(o.change_date) && (plateFilter === 'all' || o.vehicle_plate === plateFilter));
  }, [oilRecords, filteredVehicleIdsSetAll, startDate, endDate, plateFilter]);

  // Filtered maintenance records based on filtered vehicles, date range AND plate filter
  const filteredMaintenanceRecords = useMemo(() => {
    return maintenanceRecords.filter(m => filteredVehicleIdsSetAll.has(m.vehicle_id) && isInDateRange(m.maintenance_date) && (plateFilter === 'all' || m.vehicle_plate === plateFilter));
  }, [maintenanceRecords, filteredVehicleIdsSetAll, startDate, endDate, plateFilter]);

  // Global stats (filtered by vehicle + date)
  const totalKm = filteredLogs.reduce((a, l) => a + (l.km_total || 0), 0);
  const totalLiters = filteredLogs.reduce((a, l) => a + (l.liters || 0), 0);
  const fuelCost = filteredLogs.reduce((a, l) => a + (l.total_cost || 0), 0);
  const oilCostTotal = filteredOilRecords.reduce((a, o) => a + (o.service_cost || 0), 0);
  const maintCostTotal = filteredMaintenanceRecords.reduce((a, m) => a + (m.service_cost || 0), 0);
  const totalCost = fuelCost + oilCostTotal + maintCostTotal;
  const avgKmPerLiter = totalLiters > 0 ? totalKm / totalLiters : 0;
  const activeVehicles = filteredVehicles.filter((v: any) => v.status === 'active').length;
  const inactiveVehicles = filteredVehicles.length - activeVehicles;

  // Vehicle stats (filtered by date)
  const vehicleStats = filteredVehicles.map((v: any) => {
    const vLogs = filteredLogs.filter(l => l.vehicle_id === v.id);
    const vOil = filteredOilRecords.filter(o => o.vehicle_id === v.id);
    const vMaint = filteredMaintenanceRecords.filter(m => m.vehicle_id === v.id);
    // Km Atual: último km informado (maior valor entre abastecimento, óleo e manutenção)
    const lastKmFromLogs = vLogs.length > 0 ? Math.max(...vLogs.map(l => l.km_final || 0)) : 0;
    const lastKmFromOil = vOil.length > 0 ? Math.max(...vOil.map(o => o.km_at_change || 0)) : 0;
    const lastKmFromMaint = vMaint.length > 0 ? Math.max(...vMaint.map(m => m.current_km || 0)) : 0;
    const currentKm = Math.max(lastKmFromLogs, lastKmFromOil, lastKmFromMaint);
    const totalLiters = vLogs.reduce((a, l) => a + (l.liters || 0), 0);
    const totalCost = vLogs.reduce((a, l) => a + (l.total_cost || 0), 0);
    const oilCost = vOil.reduce((a, o) => a + (o.service_cost || 0), 0);
    const latestOil = vOil[0];
    const lastKm = vLogs[0]?.km_final || 0;
    const oilWarning = latestOil ? lastKm >= latestOil.next_change_km : false;
    const maintCount = filteredMaintenanceRecords.filter(m => m.vehicle_id === v.id).length;
    const maintCost = filteredMaintenanceRecords.filter(m => m.vehicle_id === v.id).reduce((a, m) => a + (m.service_cost || 0), 0);
    // Get the latest real plate from operational records
    const allPlates = [
      ...vLogs.map(l => l.vehicle_plate).filter(Boolean),
      ...vOil.map(o => o.vehicle_plate).filter(Boolean),
      ...vMaint.map(m => m.vehicle_plate).filter(Boolean),
    ];
    const displayPlate = allPlates.length > 0 ? allPlates[0] : v.plate;
    return { ...v, currentKm, totalLiters, totalCost, oilCost, latestOil, oilWarning, lastKm, maintCount, maintCost, displayPlate };
  });

  const vehiclesWithWarning = vehicleStats.filter(v => v.oilWarning).length;

  // Cost per driver over time (uses already date-filtered logs)
  const driverDailyCosts: Record<string, Record<string, number>> = {};
  const allDatesSet = new Set<string>();
  
  filteredLogs.forEach(l => {
    const d = l.log_date;
    const driver = allDrivers.find((dr: any) => dr.id === l.driver_id);
    const driverName = driver?.name?.split(' ')[0] || 'N/A';
    if (!driverDailyCosts[driverName]) driverDailyCosts[driverName] = {};
    driverDailyCosts[driverName][d] = (driverDailyCosts[driverName][d] || 0) + (l.total_cost || 0);
    allDatesSet.add(d);
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

  // Fuel type over time (uses already date-filtered logs)
  const fuelDailyData: Record<string, Record<string, number>> = {};
  const fuelDatesSet = new Set<string>();
  const fuelTypesSet = new Set<string>();
  filteredLogs.forEach(l => {
    const d = l.log_date;
    fuelDatesSet.add(d);
    fuelTypesSet.add(l.fuel_type);
    if (!fuelDailyData[d]) fuelDailyData[d] = {};
    fuelDailyData[d][l.fuel_type] = (fuelDailyData[d][l.fuel_type] || 0) + 1;
  });
  const fuelDates = Array.from(fuelDatesSet).sort();
  const fuelTypes = Array.from(fuelTypesSet);
  const fuelTimeData = fuelDates.map(date => {
    const entry: any = { date: format(parseISO(date), 'dd/MM') };
    fuelTypes.forEach(ft => { entry[ft] = fuelDailyData[date]?.[ft] || 0; });
    return entry;
  });

  // Maintenance cost by type (uses already date-filtered records)
  const maintTypeCosts: Record<string, number> = {};
  filteredMaintenanceRecords.forEach(m => {
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
        <Select value={vehicleTypeFilter} onValueChange={(val) => { setVehicleTypeFilter(val); setPlateFilter('all'); }}>
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
        <Select value={plateFilter} onValueChange={setPlateFilter}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Filtrar por placa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as placas</SelectItem>
            {uniquePlates.map(plate => (
              <SelectItem key={plate} value={plate}>{plate}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full sm:w-[170px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, 'dd/MM/yyyy') : 'Data inicial'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full sm:w-[170px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, 'dd/MM/yyyy') : 'Data final'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        {(startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
            Limpar datas
          </Button>
        )}
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
            <div>
              <p className="text-xs text-muted-foreground">Alertas Óleo</p>
              <p className="text-xl font-bold">{vehiclesWithWarning}</p>
              {(() => {
                const latestOilGlobal = filteredOilRecords.length > 0
                  ? filteredOilRecords.reduce((latest, o) => {
                      const d1 = new Date(latest.change_date).getTime();
                      const d2 = new Date(o.change_date).getTime();
                      return d2 > d1 ? o : latest;
                    })
                  : null;
                return latestOilGlobal ? (
                  <p className="text-xs text-muted-foreground mt-1">Próx. troca: {latestOilGlobal.next_change_km.toLocaleString('pt-BR')} km</p>
                ) : null;
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gasto por Veículo - Vertical bars */}
      <Card>
        <CardHeader><CardTitle className="text-base">Gasto por Veículo</CardTitle></CardHeader>
        <CardContent>
          {(() => {
            const vehicleCosts: Record<string, number> = {};
            filteredLogs.forEach(l => {
              const vehicle = allVehicles.find((v: any) => v.id === l.vehicle_id);
              const plate = l.vehicle_plate || vehicle?.plate || 'N/A';
              const typeName = vehicle ? getVehiclePrefix(vehicle.type) : 'N/A';
              const vehicleName = `${typeName} - ${plate}`;
              vehicleCosts[vehicleName] = (vehicleCosts[vehicleName] || 0) + (l.total_cost || 0);
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
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]} label={{ position: 'top', formatter: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, fontSize: 10 }}>
                    {vehicleCostData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">Sem dados no período</p>
            );
          })()}
        </CardContent>
      </Card>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut: Total Frete por Veículo */}
        <Card>
          <CardHeader><CardTitle className="text-base">Total Frete por Veículo</CardTitle></CardHeader>
          <CardContent>
            {(() => {
              const freightByVehicle: Record<string, number> = {};
              const filteredVehicleIdsForFreight = new Set(filteredVehicles.map((v: any) => v.id));
              
              deliveryRequests.forEach((req: any) => {
                if (!req.vehicle_id || !filteredVehicleIdsForFreight.has(req.vehicle_id)) return;
                if (!req.client_id || !req.transport_type) return;
                
                const matchingPrices = freightPrices.filter((fp: any) => 
                  fp.client_id === req.client_id && fp.transport_type === req.transport_type &&
                  (!req.region || fp.region === req.region)
                );
                
                if (matchingPrices.length > 0) {
                  const price = matchingPrices[0].price;
                  const vehicle = allVehicles.find((v: any) => v.id === req.vehicle_id);
                  const plate = vehicle?.plate || 'N/A';
                  const typeName = vehicle ? getVehiclePrefix(vehicle.type) : 'N/A';
                  const label = `${typeName} - ${plate}`;
                  freightByVehicle[label] = (freightByVehicle[label] || 0) + Number(price);
                }
              });

              const donutData = Object.entries(freightByVehicle)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

              const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent }: any) => {
                const RADIAN = Math.PI / 180;
                const radius = outerRadius + 22;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return percent > 0.03 ? (
                  <text x={x} y={y} fill="currentColor" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight={600}>
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                ) : null;
              };

              return donutData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      label={renderCustomLabel}
                      labelLine={false}
                    >
                      {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                    <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="py-12 text-center text-muted-foreground">Sem dados</p>;
            })()}
          </CardContent>
        </Card>

        {/* Bar: Solicitações por Veículo ao Longo do Tempo */}
        <Card>
          <CardHeader><CardTitle className="text-base">Solicitações por Veículo ao Longo do Tempo</CardTitle></CardHeader>
          <CardContent>
            {(() => {
              const filteredVehicleIdsForReqs = new Set(filteredVehicles.map((v: any) => v.id));
              // Group requests by month and vehicle
              const vehicleMonthly: Record<string, Record<string, number>> = {};
              const monthsSet = new Set<string>();
              const vehicleLabels = new Set<string>();

              deliveryRequests.forEach((req: any) => {
                if (!req.vehicle_id || !filteredVehicleIdsForReqs.has(req.vehicle_id)) return;
                const vehicle = allVehicles.find((v: any) => v.id === req.vehicle_id);
                const plate = vehicle?.plate || 'N/A';
                const typeName = vehicle ? getVehiclePrefix(vehicle.type) : 'N/A';
                const label = `${typeName} - ${plate}`;
                vehicleLabels.add(label);

                // Use created_at or scheduled_date for time grouping
                const dateStr = req.scheduled_date || req.created_at;
                if (!dateStr) return;
                const d = new Date(dateStr);
                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthsSet.add(monthKey);

                if (!vehicleMonthly[monthKey]) vehicleMonthly[monthKey] = {};
                vehicleMonthly[monthKey][label] = (vehicleMonthly[monthKey][label] || 0) + 1;
              });

              const months = Array.from(monthsSet).sort();
              const labels = Array.from(vehicleLabels);
              const barData = months.map(m => {
                const entry: any = { date: format(parseISO(`${m}-01`), 'MMM/yy', { locale: ptBR }) };
                labels.forEach(l => { entry[l] = vehicleMonthly[m]?.[l] || 0; });
                return entry;
              });

              return barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" allowDecimals={false} />
                    <Tooltip />
                    <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    {labels.map((label, i) => (
                      <Bar key={label} dataKey={label} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-12 text-center text-muted-foreground">Sem dados</p>;
            })()}
          </CardContent>
        </Card>
      </div>



      {/* Full Vehicle Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Painel Completo de Veículos</CardTitle>
          <VehicleExportPDF vehicles={filteredVehicles} logs={filteredLogs} oilRecords={filteredOilRecords} maintenanceRecords={filteredMaintenanceRecords} />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Km Atual</TableHead>
                  <TableHead>Gasto Comb.</TableHead>
                  <TableHead>Gasto Troca Óleo</TableHead>
                  <TableHead>Gasto Manut.</TableHead>
                  <TableHead>Qtd Manutenções</TableHead>
                  <TableHead>Óleo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleStats.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.type}</TableCell>
                    <TableCell>{plateFilter !== 'all' ? plateFilter : v.displayPlate}</TableCell>
                    <TableCell>{v.currentKm.toLocaleString('pt-BR')}</TableCell>
                    <TableCell>R$ {v.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>R$ {v.oilCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>R$ {v.maintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{v.maintCount}</TableCell>
                    <TableCell>
                      {v.oilWarning ? <Badge variant="destructive">Trocar</Badge> : v.latestOil ? <Badge variant="outline">OK</Badge> : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedVehicle({ id: v.id, plate: plateFilter !== 'all' ? plateFilter : v.plate })}>
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
          logs={filteredLogs}
          oilRecords={filteredOilRecords}
          maintenanceRecords={filteredMaintenanceRecords}
        />
      )}
    </div>
  );
};

export default AdminVehicleView;
