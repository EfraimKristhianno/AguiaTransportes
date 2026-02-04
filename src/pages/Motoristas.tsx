import { useState } from 'react';
import { 
  Truck as TruckIcon, 
  Search, 
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDrivers } from '@/hooks/useDrivers';

const Motoristas = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: motoristas, isLoading, error } = useDrivers();

  const getUserInitial = (nome: string) => {
    return nome?.charAt(0).toUpperCase() || '?';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      available: 'Disponível',
      busy: 'Em corrida',
      offline: 'Indisponível',
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      available: 'bg-muted text-muted-foreground border-border',
      busy: 'bg-green-50 text-green-700 border-green-200',
      offline: 'bg-red-50 text-red-700 border-red-200',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  const filteredMotoristas = (motoristas || []).filter(item => {
    const matchesSearch = 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone?.includes(searchQuery);
    return matchesSearch;
  });

  // Stats
  const stats = {
    motoristas: (motoristas || []).length,
    concluidas: (motoristas || []).reduce((acc, m) => acc + (m.completed_deliveries || 0), 0),
    ativas: (motoristas || []).reduce((acc, m) => acc + (m.active_deliveries || 0), 0),
  };

  if (error) {
    return (
      <DashboardLayout 
        title="Gestão de Motoristas" 
        subtitle="Acompanhe o desempenho e as corridas dos motoristas"
        icon={<TruckIcon className="h-5 w-5" />}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive">Erro ao carregar motoristas: {error.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Gestão de Motoristas" 
      subtitle="Acompanhe o desempenho e as corridas dos motoristas"
      icon={<TruckIcon className="h-5 w-5" />}
    >
      {/* Stats Cards */}
      <div className="mb-6 grid gap-3 grid-cols-3 lg:gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <TruckIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.motoristas}</p>
              <p className="text-sm text-muted-foreground">Motoristas</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.concluidas}</p>
              <p className="text-sm text-muted-foreground">Entregas Concluídas</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.ativas}</p>
              <p className="text-sm text-muted-foreground">Corridas Ativas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="relative lg:max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredMotoristas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TruckIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchQuery 
              ? 'Nenhum motorista encontrado com os filtros aplicados' 
              : 'Nenhum motorista cadastrado'}
          </p>
        </div>
      ) : (
        <>
          {/* Table - Desktop */}
          <div className="hidden rounded-xl border border-border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Concluídas</TableHead>
                  <TableHead className="text-center">Ativas</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMotoristas.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                          {getUserInitial(item.name)}
                        </div>
                        <span className="font-medium text-foreground">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={item.is_fixed ? 'bg-primary/10 text-primary' : 'bg-muted'}>
                        {item.is_fixed ? 'Fixo' : 'Agregado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{item.total_deliveries}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">{item.completed_deliveries}</TableCell>
                    <TableCell className="text-center text-orange-600 font-medium">{item.active_deliveries}</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant="outline" 
                        className={getStatusBadge(item.status)}
                      >
                        {getStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards - Mobile */}
          <div className="space-y-3 lg:hidden">
            {filteredMotoristas.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {getUserInitial(item.name)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.phone || '-'}</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getStatusBadge(item.status)}
                  >
                    {getStatusLabel(item.status)}
                  </Badge>
                </div>
                <div className="mb-2">
                  <Badge variant="outline" className={item.is_fixed ? 'bg-primary/10 text-primary' : 'bg-muted'}>
                    {item.is_fixed ? 'Fixo' : 'Agregado'}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-bold">{item.total_deliveries}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Concluídas</p>
                    <p className="font-bold text-green-600">{item.completed_deliveries}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ativas</p>
                    <p className="font-bold text-orange-600">{item.active_deliveries}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Motoristas;
