import { useState } from 'react';
import { 
  Car, 
  Search, 
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Gauge,
  Ruler
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '@/hooks/useVehicles';
import { Vehicle } from '@/types/database';

const Veiculos = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    plate: '',
    type: '',
    brand: '',
    model: '',
    year: '',
    capacity: '',
    length: '',
    width: '',
    height: '',
    status: 'active' as 'active' | 'maintenance' | 'inactive',
  });
  
  const { data: veiculos, isLoading, error } = useVehicles();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const resetForm = () => {
    setFormData({
      plate: '',
      type: '',
      brand: '',
      model: '',
      year: '',
      capacity: '',
      length: '',
      width: '',
      height: '',
      status: 'active',
    });
  };

  const handleCreate = async () => {
    if (!formData.plate || !formData.type) return;
    
    await createVehicle.mutateAsync({
      plate: formData.plate,
      type: formData.type,
      brand: formData.brand || undefined,
      model: formData.model || undefined,
      year: formData.year ? parseInt(formData.year) : undefined,
      capacity: formData.capacity ? parseFloat(formData.capacity) : undefined,
      length: formData.length ? parseFloat(formData.length) : undefined,
      width: formData.width ? parseFloat(formData.width) : undefined,
      height: formData.height ? parseFloat(formData.height) : undefined,
      status: formData.status,
    });
    
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = async () => {
    if (!editingVehicle || !formData.plate || !formData.type) return;
    
    await updateVehicle.mutateAsync({
      vehicleId: editingVehicle.id,
      updates: {
        plate: formData.plate,
        type: formData.type,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        capacity: formData.capacity ? parseFloat(formData.capacity) : undefined,
        length: formData.length ? parseFloat(formData.length) : undefined,
        width: formData.width ? parseFloat(formData.width) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        status: formData.status,
      },
    });
    
    setEditingVehicle(null);
    resetForm();
  };

  const handleDelete = async (vehicleId: string) => {
    await deleteVehicle.mutateAsync(vehicleId);
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setFormData({
      plate: vehicle.plate || '',
      type: vehicle.type || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      year: vehicle.year?.toString() || '',
      capacity: vehicle.capacity?.toString() || '',
      length: vehicle.length?.toString() || '',
      width: vehicle.width?.toString() || '',
      height: vehicle.height?.toString() || '',
      status: vehicle.status || 'active',
    });
    setEditingVehicle(vehicle);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Ativo',
      maintenance: 'Manutenção',
      inactive: 'Inativo',
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-50 text-green-700 border-green-200',
      maintenance: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      inactive: 'bg-red-50 text-red-700 border-red-200',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  const getTypeIcon = (type: string) => {
    return type?.charAt(0).toUpperCase() || '?';
  };

  const filteredVeiculos = (veiculos || []).filter(item => {
    const matchesSearch = 
      item.plate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Group by type for stats
  const typeStats = (veiculos || []).reduce((acc, v) => {
    const type = v.type || 'Outros';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const FormFields = () => (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="plate">Placa *</Label>
          <Input
            id="plate"
            value={formData.plate}
            onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
            placeholder="ABC-1234"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="type">Tipo *</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Moto">Moto</SelectItem>
              <SelectItem value="Carro">Carro</SelectItem>
              <SelectItem value="Van">Van</SelectItem>
              <SelectItem value="Caminhão">Caminhão</SelectItem>
              <SelectItem value="Caminhão Baú">Caminhão Baú</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="brand">Marca</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            placeholder="Fiat, VW, etc."
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="model">Modelo</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            placeholder="Strada, Gol, etc."
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="year">Ano</Label>
          <Input
            id="year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            placeholder="2024"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="capacity">Capacidade (kg)</Label>
          <Input
            id="capacity"
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            placeholder="1000"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="length">Comprimento (m)</Label>
          <Input
            id="length"
            type="number"
            step="0.01"
            value={formData.length}
            onChange={(e) => setFormData({ ...formData, length: e.target.value })}
            placeholder="2.5"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="width">Largura (m)</Label>
          <Input
            id="width"
            type="number"
            step="0.01"
            value={formData.width}
            onChange={(e) => setFormData({ ...formData, width: e.target.value })}
            placeholder="1.5"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="height">Altura (m)</Label>
          <Input
            id="height"
            type="number"
            step="0.01"
            value={formData.height}
            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
            placeholder="1.8"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="maintenance">Manutenção</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (error) {
    return (
      <DashboardLayout 
        title="Gestão de Veículos" 
        subtitle="Visualize e gerencie todos os veículos"
        icon={<Car className="h-5 w-5" />}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive">Erro ao carregar veículos: {error.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Gestão de Veículos" 
      subtitle="Visualize e gerencie todos os veículos"
      icon={<Car className="h-5 w-5" />}
    >
      {/* Stats by type */}
      <div className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-5">
        {Object.entries(typeStats).map(([type, count]) => (
          <div key={type} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{count}</p>
            <p className="text-sm text-muted-foreground">{type}</p>
          </div>
        ))}
        {Object.keys(typeStats).length === 0 && (
          <div className="rounded-xl border border-border bg-card p-4 text-center col-span-full">
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-sm text-muted-foreground">Total de Veículos</p>
          </div>
        )}
      </div>

      {/* Search and Actions */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa, tipo, marca ou modelo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Veículo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Veículo</DialogTitle>
                <DialogDescription>
                  Preencha os dados para cadastrar um novo veículo.
                </DialogDescription>
              </DialogHeader>
              <FormFields />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={!formData.plate || !formData.type || createVehicle.isPending}>
                  {createVehicle.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredVeiculos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Car className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchQuery 
              ? 'Nenhum veículo encontrado com os filtros aplicados' 
              : 'Nenhum veículo cadastrado'}
          </p>
        </div>
      ) : (
        <>
          {/* Table - Desktop */}
          <div className="hidden rounded-xl border border-border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Dimensões</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVeiculos.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                          {getTypeIcon(item.type)}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{item.type}</span>
                          <p className="text-sm text-muted-foreground">
                            {item.brand} {item.model} {item.year ? `(${item.year})` : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-medium">{item.plate}</TableCell>
                    <TableCell>
                      {item.capacity ? (
                        <div className="flex items-center gap-1">
                          <Gauge className="h-3 w-3 text-muted-foreground" />
                          {item.capacity} kg
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {(item.length || item.width || item.height) ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Ruler className="h-3 w-3 text-muted-foreground" />
                          {item.length || '-'} × {item.width || '-'} × {item.height || '-'} m
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadge(item.status)}>
                        {getStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Dialog open={editingVehicle?.id === item.id} onOpenChange={(open) => !open && setEditingVehicle(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Veículo</DialogTitle>
                              <DialogDescription>
                                Atualize os dados do veículo.
                              </DialogDescription>
                            </DialogHeader>
                            <FormFields />
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingVehicle(null)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleEdit} disabled={!formData.plate || !formData.type || updateVehicle.isPending}>
                                {updateVehicle.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Salvar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O veículo "{item.plate}" será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(item.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards - Mobile */}
          <div className="space-y-3 lg:hidden">
            {filteredVeiculos.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.type}</p>
                      <p className="text-sm text-muted-foreground font-mono">{item.plate}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusBadge(item.status)}>
                    {getStatusLabel(item.status)}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm mb-3">
                  {(item.brand || item.model) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modelo</span>
                      <span>{item.brand} {item.model} {item.year ? `(${item.year})` : ''}</span>
                    </div>
                  )}
                  {item.capacity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capacidade</span>
                      <span>{item.capacity} kg</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O veículo "{item.plate}" será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(item.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit Dialog for Mobile */}
      <Dialog open={editingVehicle !== null && !document.querySelector('.lg\\:block')} onOpenChange={(open) => !open && setEditingVehicle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Veículo</DialogTitle>
          </DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVehicle(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={!formData.plate || !formData.type || updateVehicle.isPending}>
              {updateVehicle.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Veiculos;
