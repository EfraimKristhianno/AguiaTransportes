import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useVehicleLogs, useOilChangeRecords } from '@/hooks/useVehicleLogs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Fuel, Gauge, Droplets, Car, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';

const COLORS = ['#d32127', '#e8783a', '#f5a623', '#4a9eda', '#6bc5a0'];

const AdminVehicleView = () => {
  const { data: logs = [], isLoading } = useVehicleLogs();
  const { data: oilRecords = [] } = useOilChangeRecords();

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

  // Global stats
  const totalKm = logs.reduce((a, l) => a + (l.km_total || 0), 0);
  const totalLiters = logs.reduce((a, l) => a + (l.liters || 0), 0);
  const totalCost = logs.reduce((a, l) => a + (l.total_cost || 0), 0);
  const avgKmPerLiter = totalLiters > 0 ? totalKm / totalLiters : 0;
  const activeVehicles = allVehicles.filter((v: any) => v.status === 'active').length;
  const inactiveVehicles = allVehicles.length - activeVehicles;

  // Vehicles with oil warning
  const vehicleStats = allVehicles.map((v: any) => {
    const vLogs = logs.filter(l => l.vehicle_id === v.id);
    const vOil = oilRecords.filter(o => o.vehicle_id === v.id);
    const totalKm = vLogs.reduce((a, l) => a + (l.km_total || 0), 0);
    const totalLiters = vLogs.reduce((a, l) => a + (l.liters || 0), 0);
    const totalCost = vLogs.reduce((a, l) => a + (l.total_cost || 0), 0);
    const latestOil = vOil[0];
    const lastKm = vLogs[0]?.km_final || 0;
    const oilWarning = latestOil ? lastKm >= latestOil.next_change_km : false;
    return { ...v, totalKm, totalLiters, totalCost, latestOil, oilWarning, lastKm };
  });

  const vehiclesWithWarning = vehicleStats.filter(v => v.oilWarning).length;

  // Daily cost trend (last 30 days)
  const last30 = subDays(new Date(), 30);
  const dailyCosts: Record<string, number> = {};
  logs.forEach(l => {
    const d = l.log_date;
    if (new Date(d) >= last30) {
      dailyCosts[d] = (dailyCosts[d] || 0) + (l.total_cost || 0);
    }
  });
  const costTrend = Object.entries(dailyCosts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date: format(parseISO(date), 'dd/MM'), cost }));

  // Cost per driver
  const driverCosts = allDrivers.map((d: any) => {
    const dLogs = logs.filter(l => l.driver_id === d.id);
    const cost = dLogs.reduce((a, l) => a + (l.total_cost || 0), 0);
    return { name: d.name?.split(' ')[0] || 'N/A', cost };
  }).filter(d => d.cost > 0).sort((a, b) => b.cost - a.cost);

  // Km per vehicle chart
  const kmChartData = vehicleStats.filter(v => v.totalKm > 0).map(v => ({ name: v.plate, km: v.totalKm }));

  // Fuel type pie
  const fuelCounts = logs.reduce((acc, l) => { acc[l.fuel_type] = (acc[l.fuel_type] || 0) + 1; return acc; }, {} as Record<string, number>);
  const fuelChartData = Object.entries(fuelCounts).map(([name, value]) => ({ name, value }));

  // Vehicle status pie
  const statusData = [
    { name: 'Ativos', value: activeVehicles },
    { name: 'Inativos', value: inactiveVehicles },
  ].filter(d => d.value > 0);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <div className="rounded-lg bg-blue-500/10 p-2"><Car className="h-5 w-5 text-blue-500" /></div>
          <div><p className="text-xs text-muted-foreground">Veículos</p><p className="text-xl font-bold">{allVehicles.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <div className="rounded-lg bg-green-500/10 p-2"><Gauge className="h-5 w-5 text-green-500" /></div>
          <div><p className="text-xs text-muted-foreground">Km Total</p><p className="text-xl font-bold">{totalKm.toLocaleString('pt-BR')}</p></div>
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

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Tendência de Gastos (30 dias)</CardTitle></CardHeader>
          <CardContent>
            {costTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={costTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Area type="monotone" dataKey="cost" stroke="#d32127" fill="#d32127" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">Sem dados nos últimos 30 dias</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Gasto por Motorista</CardTitle></CardHeader>
          <CardContent>
            {driverCosts.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={driverCosts.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Bar dataKey="cost" fill="#e8783a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Km por Veículo</CardTitle></CardHeader>
          <CardContent>
            {kmChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={kmChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="km" fill="#d32127" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="py-12 text-center text-muted-foreground">Sem dados</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Tipo de Combustível</CardTitle></CardHeader>
          <CardContent>
            {fuelChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={fuelChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                    {fuelChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend /><Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="py-12 text-center text-muted-foreground">Sem dados</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Status da Frota</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                    <Cell fill="#6bc5a0" />
                    <Cell fill="#ccc" />
                  </Pie>
                  <Legend /><Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="py-12 text-center text-muted-foreground">Sem dados</p>}
          </CardContent>
        </Card>
      </div>

      {/* Full Vehicle Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Painel Completo de Veículos</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Km Total</TableHead>
                  <TableHead>Litros</TableHead>
                  <TableHead>Gasto</TableHead>
                  <TableHead>Km/L</TableHead>
                  <TableHead>Óleo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleStats.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.plate}</TableCell>
                    <TableCell>{v.type}</TableCell>
                    <TableCell><Badge variant={v.status === 'active' ? 'default' : 'secondary'}>{v.status === 'active' ? 'Ativo' : v.status === 'maintenance' ? 'Manutenção' : 'Inativo'}</Badge></TableCell>
                    <TableCell>{v.totalKm.toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{v.totalLiters.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</TableCell>
                    <TableCell>R$ {v.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{v.totalLiters > 0 ? (v.totalKm / v.totalLiters).toFixed(1) : '-'}</TableCell>
                    <TableCell>
                      {v.oilWarning ? <Badge variant="destructive">Trocar</Badge> : v.latestOil ? <Badge variant="outline">OK</Badge> : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminVehicleView;
