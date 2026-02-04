import { useState } from 'react';
import { 
  Truck as TruckIcon, 
  Search, 
  CheckCircle,
  Clock
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

// Mock data for demonstration
const mockMotoristas = [
  { 
    id: 1, 
    nome: 'Vilson Aguia', 
    telefone: '41988525645', 
    total: 0,
    concluidas: 0,
    ativas: 0,
    status: 'Disponível'
  },
];

const Motoristas = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const getUserInitial = (nome: string) => {
    return nome.charAt(0).toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'Disponível': 'bg-muted text-muted-foreground border-border',
      'Em corrida': 'bg-green-50 text-green-700 border-green-200',
      'Indisponível': 'bg-red-50 text-red-700 border-red-200',
    };
    return styles[status as keyof typeof styles] || 'bg-muted text-muted-foreground';
  };

  const filteredMotoristas = mockMotoristas.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.telefone.includes(searchQuery);
    return matchesSearch;
  });

  // Stats
  const stats = {
    motoristas: mockMotoristas.length,
    concluidas: mockMotoristas.reduce((acc, m) => acc + m.concluidas, 0),
    ativas: mockMotoristas.reduce((acc, m) => acc + m.ativas, 0),
  };

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

      {/* Table - Desktop */}
      <div className="hidden rounded-xl border border-border bg-card lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Motorista</TableHead>
              <TableHead>Telefone</TableHead>
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
                      {getUserInitial(item.nome)}
                    </div>
                    <span className="font-medium text-foreground">{item.nome}</span>
                  </div>
                </TableCell>
                <TableCell>{item.telefone}</TableCell>
                <TableCell className="text-center">{item.total}</TableCell>
                <TableCell className="text-center text-green-600 font-medium">{item.concluidas}</TableCell>
                <TableCell className="text-center text-orange-600 font-medium">{item.ativas}</TableCell>
                <TableCell className="text-right">
                  <Badge 
                    variant="outline" 
                    className={getStatusBadge(item.status)}
                  >
                    {item.status}
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
                  {getUserInitial(item.nome)}
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.nome}</p>
                  <p className="text-sm text-muted-foreground">{item.telefone}</p>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={getStatusBadge(item.status)}
              >
                {item.status}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-bold">{item.total}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Concluídas</p>
                <p className="font-bold text-green-600">{item.concluidas}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ativas</p>
                <p className="font-bold text-orange-600">{item.ativas}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Motoristas;
