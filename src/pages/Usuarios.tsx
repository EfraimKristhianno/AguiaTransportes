import { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Pencil,
  UserCog,
  Shield,
  Truck as TruckIcon,
  User
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
const mockUsuarios = [
  { 
    id: 1, 
    nome: 'Vilson Aguia', 
    telefone: '41988525645', 
    perfil: 'Motorista',
    cadastro: '29/01/2026' 
  },
  { 
    id: 2, 
    nome: 'Pedro', 
    telefone: '-', 
    perfil: 'Cliente',
    cadastro: '29/01/2026' 
  },
  { 
    id: 3, 
    nome: 'Efraim Kristhianno', 
    telefone: '-', 
    perfil: 'Administrador',
    cadastro: '29/01/2026' 
  },
  { 
    id: 4, 
    nome: 'Efraim', 
    telefone: '-', 
    perfil: 'Gestor',
    cadastro: '29/01/2026' 
  },
];

const Usuarios = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [perfilFilter, setPerfilFilter] = useState('todos');

  const getPerfilBadge = (perfil: string) => {
    const styles = {
      'Administrador': 'bg-red-50 text-red-700 border-red-200',
      'Gestor': 'bg-primary/10 text-primary border-primary/20',
      'Motorista': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'Cliente': 'bg-muted text-muted-foreground border-border',
    };
    return styles[perfil as keyof typeof styles] || 'bg-muted text-muted-foreground';
  };

  const getUserInitial = (nome: string) => {
    return nome.charAt(0).toUpperCase();
  };

  const getInitialBgColor = (perfil: string) => {
    const colors = {
      'Administrador': 'bg-red-100 text-red-700',
      'Gestor': 'bg-primary/10 text-primary',
      'Motorista': 'bg-cyan-100 text-cyan-700',
      'Cliente': 'bg-muted text-muted-foreground',
    };
    return colors[perfil as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  const filteredUsuarios = mockUsuarios.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.telefone.includes(searchQuery);
    const matchesPerfil = perfilFilter === 'todos' || item.perfil.toLowerCase() === perfilFilter.toLowerCase();
    return matchesSearch && matchesPerfil;
  });

  // Stats
  const stats = {
    administradores: mockUsuarios.filter(u => u.perfil === 'Administrador').length,
    gestores: mockUsuarios.filter(u => u.perfil === 'Gestor').length,
    motoristas: mockUsuarios.filter(u => u.perfil === 'Motorista').length,
    clientes: mockUsuarios.filter(u => u.perfil === 'Cliente').length,
  };

  return (
    <DashboardLayout 
      title="Gestão de Usuários" 
      subtitle="Visualize e gerencie todos os usuários do sistema"
      icon={<Users className="h-5 w-5" />}
    >
      {/* Stats Cards */}
      <div className="mb-6 grid gap-3 grid-cols-2 lg:gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.administradores}</p>
          <p className="text-sm text-muted-foreground">Administradores</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.gestores}</p>
          <p className="text-sm text-muted-foreground">Gestores</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.motoristas}</p>
          <p className="text-sm text-muted-foreground">Motoristas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.clientes}</p>
          <p className="text-sm text-muted-foreground">Clientes</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={perfilFilter} onValueChange={setPerfilFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="administrador">Administrador</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="motorista">Motorista</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
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
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsuarios.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${getInitialBgColor(item.perfil)}`}>
                      {getUserInitial(item.nome)}
                    </div>
                    <span className="font-medium text-foreground">{item.nome}</span>
                  </div>
                </TableCell>
                <TableCell>{item.telefone}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={getPerfilBadge(item.perfil)}
                  >
                    {item.perfil}
                  </Badge>
                </TableCell>
                <TableCell>{item.cadastro}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cards - Mobile */}
      <div className="space-y-3 lg:hidden">
        {filteredUsuarios.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${getInitialBgColor(item.perfil)}`}>
                  {getUserInitial(item.nome)}
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.nome}</p>
                  <p className="text-sm text-muted-foreground">{item.telefone}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <Badge 
                variant="outline" 
                className={getPerfilBadge(item.perfil)}
              >
                {item.perfil}
              </Badge>
              <span className="text-muted-foreground">{item.cadastro}</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Usuarios;
