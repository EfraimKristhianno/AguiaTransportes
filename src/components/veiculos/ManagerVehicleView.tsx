import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useVehicleLogs, useOilChangeRecords } from '@/hooks/useVehicleLogs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Fuel, Gauge, Droplets, Car, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#d32127', '#e8783a', '#f5a623', '#4a9eda', '#6bc5a0'];

const ManagerVehicleView = () => {
  const { data: logs = [], isLoading } = useVehicleLogs();
  const { data: oilRecords = [] } = useOilChangeRecords();

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['all_vehicles'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('*').eq('status', 'active');
      return data || [];
    },
  });

  // Aggregate stats per vehicle
  const vehicleStats = allVehicles.map((v: any) => {
    const vLogs = logs.filter(l => l.vehicle_id === v.id);
    const totalKm = vLogs.reduce((a, l) => a + (l.km_total || 0), 0);
    const totalLiters = vLogs.reduce((a, l) => a + (l.liters || 0), 0);
    const totalCost = vLogs.reduce((a, l) => a + (l.total_cost || 0), 0);
    const latestOil = oilRecords.find(o => o.vehicle_id === v.id);
    const lastKm = vLogs[0]?.km_final || 0;
    const oilWarning = latestOil ? lastKm >= latestOil.next_change_km : false;

    return { ...v, totalKm, totalLiters, totalCost, latestOil, oilWarning, logCount: vLogs.length };
  });

  // Chart: Km per vehicle
  const kmChartData = vehicleStats
    .filter(v => v.totalKm > 0)
    .map(v => ({ name: v.plate, km: v.totalKm }));

  // Chart: Fuel type distribution
  const fuelCounts = logs.reduce((acc, l) => {
    acc[l.fuel_type] = (acc[l.fuel_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const fuelChartData = Object.entries(fuelCounts).map(([name, value]) => ({ name, value }));

  // Global stats
  const totalKm = logs.reduce((a, l) => a + (l.km_total || 0), 0);
  const totalLiters = logs.reduce((a, l) => a + (l.liters || 0), 0);
  const totalCost = logs.reduce((a, l) => a + (l.total_cost || 0), 0);
  const vehiclesWithWarning = vehicleStats.filter(v => v.oilWarning).length;

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-blue-500/10 p-2"><Car className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-xs text-muted-foreground">Veículos Ativos</p><p className="text-xl font-bold">{allVehicles.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-green-500/10 p-2"><Gauge className="h-5 w-5 text-green-500" /></div>
            <div><p className="text-xs text-muted-foreground">Km Total (Frota)</p><p className="text-xl font-bold">{totalKm.toLocaleString('pt-BR')}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-amber-500/10 p-2"><Fuel className="h-5 w-5 text-amber-500" /></div>
            <div><p className="text-xs text-muted-foreground">Gasto Total</p><p className="text-xl font-bold">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
          </CardContent>
        </Card>
        <Card className={vehiclesWithWarning > 0 ? 'border-destructive' : ''}>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className={`rounded-lg p-2 ${vehiclesWithWarning > 0 ? 'bg-destructive/10' : 'bg-purple-500/10'}`}>
              <AlertTriangle className={`h-5 w-5 ${vehiclesWithWarning > 0 ? 'text-destructive' : 'text-purple-500'}`} />
            </div>
            <div><p className="text-xs text-muted-foreground">Alertas Óleo</p><p className="text-xl font-bold">{vehiclesWithWarning}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Km por Veículo</CardTitle></CardHeader>
          <CardContent>
            {kmChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={kmChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="km" fill="#d32127" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">Sem dados para exibir</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Combustível por Tipo</CardTitle></CardHeader>
          <CardContent>
            {fuelChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={fuelChartData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {fuelChartData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">Sem dados para exibir</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Indicadores por Veículo</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
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
                    <TableCell>{v.totalKm.toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{v.totalLiters.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</TableCell>
                    <TableCell>R$ {v.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{v.totalLiters > 0 ? (v.totalKm / v.totalLiters).toFixed(1) : '-'}</TableCell>
                    <TableCell>
                      {v.oilWarning ? (
                        <Badge variant="destructive">Trocar</Badge>
                      ) : v.latestOil ? (
                        <Badge variant="outline">OK</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
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

export default ManagerVehicleView;
