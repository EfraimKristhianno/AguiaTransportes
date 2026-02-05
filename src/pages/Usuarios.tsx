import { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter,
  Pencil,
  Plus,
  Loader2,
  ShieldAlert
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
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/useUsers';
import { useDriverVehicleTypes, useSaveDriverVehicleTypes } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, UserWithRole } from '@/types/database';
import UserFormDialog from '@/components/UserFormDialog';

const Usuarios = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [perfilFilter, setPerfilFilter] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  
  const { role: currentUserRole, roleLoading } = useAuth();
  const { data: usuarios, isLoading, error } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const saveDriverVehicleTypes = useSaveDriverVehicleTypes();
  
  // Fetch vehicle types for the selected user if they're a motorista
  const { data: selectedUserVehicleTypes = [] } = useDriverVehicleTypes(
    selectedUser?.role === 'motorista' ? selectedUser?.auth_id : undefined
  );

  const isAdmin = currentUserRole === 'admin';

  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      admin: 'Administrador',
      gestor: 'Gestor',
      motorista: 'Motorista',
      cliente: 'Cliente',
    };
    return labels[role] || 'Cliente';
  };

  const getPerfilBadge = (role: UserRole) => {
    const styles: Record<UserRole, string> = {
      admin: 'bg-destructive/10 text-destructive border-destructive/20',
      gestor: 'bg-primary/10 text-primary border-primary/20',
      motorista: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      cliente: 'bg-muted text-muted-foreground border-border',
    };
    return styles[role] || 'bg-muted text-muted-foreground';
  };

  const getUserInitial = (nome: string) => {
    return nome?.charAt(0).toUpperCase() || '?';
  };

  const getInitialBgColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      admin: 'bg-destructive/10 text-destructive',
      gestor: 'bg-primary/10 text-primary',
      motorista: 'bg-emerald-100 text-emerald-700',
      cliente: 'bg-muted text-muted-foreground',
    };
    return colors[role] || 'bg-muted text-muted-foreground';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const filteredUsuarios = (usuarios || []).filter(item => {
    const matchesSearch = 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone?.includes(searchQuery) ||
      item.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPerfil = perfilFilter === 'todos' || item.role === perfilFilter;
    return matchesSearch && matchesPerfil;
  });

  // Stats
  const stats = {
    administradores: (usuarios || []).filter(u => u.role === 'admin').length,
    gestores: (usuarios || []).filter(u => u.role === 'gestor').length,
    motoristas: (usuarios || []).filter(u => u.role === 'motorista').length,
    clientes: (usuarios || []).filter(u => u.role === 'cliente').length,
  };

  const handleOpenDialog = (user?: UserWithRole) => {
    setSelectedUser(user || null);
    setDialogOpen(true);
  };

  const handleSubmitUser = async (
    data: { name: string; email: string; phone?: string; password?: string; role: UserRole; vehicleTypes?: string[] },
    userId?: string,
    authId?: string
  ) => {
    if (userId && selectedUser) {
      // Update existing user
      await updateUser.mutateAsync({
        userId,
        authId: selectedUser.auth_id,
        updates: {
          name: data.name,
          phone: data.phone,
        },
        role: data.role,
      });
      
      // Save vehicle types if user is a motorista
      if (data.role === 'motorista' && data.vehicleTypes) {
        await saveDriverVehicleTypes.mutateAsync({
          authId: selectedUser.auth_id,
          vehicleTypes: data.vehicleTypes,
        });
      }
    } else {
      // Create new user
      await createUser.mutateAsync({
        email: data.email,
        password: data.password!,
        name: data.name,
        phone: data.phone,
        role: data.role,
      });
      
      // Note: For new users, we need to update the edge function to handle vehicle types
      // For now, vehicle types for new users will need to be added after creation via edit
    }
    setSelectedUser(null);
  };

  // Show access denied if not admin
  if (!roleLoading && !isAdmin) {
    return (
      <DashboardLayout 
        title="Gestão de Usuários" 
        subtitle="Visualize e gerencie todos os usuários do sistema"
        icon={<Users className="h-5 w-5" />}
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            Apenas administradores podem acessar a gestão de usuários. 
            Entre em contato com um administrador se precisar de suporte.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout 
        title="Gestão de Usuários" 
        subtitle="Visualize e gerencie todos os usuários do sistema"
        icon={<Users className="h-5 w-5" />}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive">Erro ao carregar usuários: {error.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      </DashboardLayout>
    );
  }

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
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="motorista">Motorista</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => handleOpenDialog()} className="hidden lg:flex">
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Add Button */}
      <Button 
        onClick={() => handleOpenDialog()} 
        className="mb-4 w-full lg:hidden"
      >
        <Plus className="h-4 w-4 mr-2" />
        Novo Usuário
      </Button>

      {isLoading || roleLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredUsuarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchQuery || perfilFilter !== 'todos' 
              ? 'Nenhum usuário encontrado com os filtros aplicados' 
              : 'Nenhum usuário cadastrado'}
          </p>
          <Button onClick={() => handleOpenDialog()} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar primeiro usuário
          </Button>
        </div>
      ) : (
        <>
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
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${getInitialBgColor(item.role)}`}>
                          {getUserInitial(item.name)}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{item.name}</span>
                          <p className="text-sm text-muted-foreground">{item.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getPerfilBadge(item.role)}
                      >
                        {getRoleLabel(item.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenDialog(item)}
                      >
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
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${getInitialBgColor(item.role)}`}>
                      {getUserInitial(item.name)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.phone || item.email}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleOpenDialog(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Badge 
                    variant="outline" 
                    className={getPerfilBadge(item.role)}
                  >
                    {getRoleLabel(item.role)}
                  </Badge>
                  <span className="text-muted-foreground">{formatDate(item.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* User Form Dialog */}
      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        onSubmit={handleSubmitUser}
        isSubmitting={createUser.isPending || updateUser.isPending || saveDriverVehicleTypes.isPending}
        initialVehicleTypes={selectedUserVehicleTypes}
      />
    </DashboardLayout>
  );
};

export default Usuarios;
