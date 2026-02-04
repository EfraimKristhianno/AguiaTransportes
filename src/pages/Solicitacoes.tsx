import { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye,
  CheckCircle,
  Truck as TruckIcon,
  Calendar
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

// Mock data for demonstration
const mockSolicitacoes = [
  { 
    id: 1, 
    cliente: 'Mike', 
    telefone: '41937837673', 
    material: 'Outros', 
    transporte: 'Moto', 
    endereco: 'Buhler',
    status: 'Entregue', 
    data: '30/01/2026' 
  },
  { 
    id: 2, 
    cliente: 'Douglas', 
    telefone: '41985308489', 
    material: 'Alimentos', 
    transporte: 'Carro', 
    endereco: 'Rua Alberto Kosop 190 - Pinheirinho',
    status: 'Entregue', 
    data: '29/01/2026' 
  },
  { 
    id: 3, 
    cliente: 'Pedro', 
    telefone: '41985642578', 
    material: 'Medicamentos', 
    transporte: 'Van', 
    endereco: 'Rua Alberto Kosop 190 - Pinheirinho',
    status: 'Enviado', 
    data: '29/01/2026' 
  },
  { 
    id: 4, 
    cliente: 'Antonio', 
    telefone: '41985308489', 
    material: 'Materiais de construção', 
    transporte: 'Carro', 
    endereco: 'Rua Alberto Kosop 190 - Pinheirinho',
    status: 'Enviado', 
    data: '29/01/2026' 
  },
];

const Solicitacoes = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const getStatusBadge = (status: string) => {
    const styles = {
      'Entregue': 'bg-green-50 text-green-700 border-green-200',
      'Enviado': 'bg-blue-50 text-blue-700 border-blue-200',
      'Pendente': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Cancelado': 'bg-red-50 text-red-700 border-red-200',
    };
    return styles[status as keyof typeof styles] || 'bg-muted text-muted-foreground';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Entregue':
        return <CheckCircle className="mr-1 h-3 w-3" />;
      case 'Enviado':
        return <TruckIcon className="mr-1 h-3 w-3" />;
      default:
        return null;
    }
  };

  const filteredSolicitacoes = mockSolicitacoes.filter(item => {
    const matchesSearch = item.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.material.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || item.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout 
      title="Solicitações" 
      subtitle="Visualize e gerencie todas as solicitações de coleta"
      icon={<FileText className="h-5 w-5" />}
    >
      {/* Search and Filter */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table - Desktop */}
      <div className="hidden rounded-xl border border-border bg-card lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Transporte</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSolicitacoes.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{item.cliente}</p>
                    <p className="text-sm text-muted-foreground">{item.telefone}</p>
                  </div>
                </TableCell>
                <TableCell>{item.material}</TableCell>
                <TableCell>{item.transporte}</TableCell>
                <TableCell className="max-w-[200px] truncate">{item.endereco}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={getStatusBadge(item.status)}
                  >
                    {getStatusIcon(item.status)}
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {item.data}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cards - Mobile */}
      <div className="space-y-3 lg:hidden">
        {filteredSolicitacoes.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground">{item.cliente}</p>
                <p className="text-sm text-muted-foreground">{item.telefone}</p>
              </div>
              <Badge 
                variant="outline" 
                className={getStatusBadge(item.status)}
              >
                {getStatusIcon(item.status)}
                {item.status}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Material</span>
                <span className="font-medium">{item.material}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transporte</span>
                <span className="font-medium">{item.transporte}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium">{item.data}</span>
              </div>
              <p className="text-muted-foreground">{item.endereco}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Solicitacoes;
