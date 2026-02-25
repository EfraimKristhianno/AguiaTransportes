 import { useState, useEffect } from 'react';
 import { useForm } from 'react-hook-form';
 import { zodResolver } from '@hookform/resolvers/zod';
 import { z } from 'zod';
 import { Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
 import { Badge } from '@/components/ui/badge';
import { UserWithRole, UserRole } from '@/types/database';
 import VehicleDetailsPopover, { VEHICLE_SPECS } from './VehicleDetailsPopover';

 // Use vehicle types from the database specs
 const VEHICLE_TYPES = VEHICLE_SPECS.map(spec => ({
   value: spec.type,
   label: spec.type,
 }));

const userFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  username: z.string().min(3, 'Usuário deve ter pelo menos 3 caracteres').max(50, 'Usuário muito longo'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
  role: z.enum(['admin', 'gestor', 'motorista', 'cliente']),
  vehicleTypes: z.array(z.string()).optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserWithRole | null;
  onSubmit: (data: UserFormValues, userId?: string, authId?: string) => Promise<void>;
  isSubmitting: boolean;
  initialVehicleTypes?: string[];
}

const UserFormDialog = ({
  open,
  onOpenChange,
  user,
  onSubmit,
  isSubmitting,
  initialVehicleTypes = [],
}: UserFormDialogProps) => {
  const isEditing = !!user;
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>(initialVehicleTypes);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(
      isEditing 
        ? userFormSchema.omit({ password: true }) 
        : userFormSchema.extend({
            password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
          })
    ),
    defaultValues: {
      name: '',
      username: '',
      phone: '',
      password: '',
      role: 'cliente',
      vehicleTypes: [],
    },
  });

  const watchedRole = form.watch('role');

  useEffect(() => {
    if (user) {
      // Extract username from internal email (remove @aguia.internal suffix)
      const storedEmail = user.email || '';
      const username = storedEmail.endsWith('@aguia.internal') 
        ? storedEmail.replace('@aguia.internal', '') 
        : storedEmail;
      form.reset({
        name: user.name || '',
        username,
        phone: user.phone || '',
        role: user.role,
        vehicleTypes: initialVehicleTypes,
      });
      setSelectedVehicleTypes(initialVehicleTypes);
    } else {
      form.reset({
        name: '',
        username: '',
        phone: '',
        password: '',
        role: 'cliente',
        vehicleTypes: [],
      });
      setSelectedVehicleTypes([]);
    }
  }, [user, form, initialVehicleTypes]);

  // Reset vehicle types when role changes away from motorista
  useEffect(() => {
    if (watchedRole !== 'motorista') {
      setSelectedVehicleTypes([]);
      form.setValue('vehicleTypes', []);
    }
  }, [watchedRole, form]);

  const toggleVehicleType = (type: string) => {
    const newTypes = selectedVehicleTypes.includes(type)
      ? selectedVehicleTypes.filter(t => t !== type)
      : [...selectedVehicleTypes, type];
    setSelectedVehicleTypes(newTypes);
    form.setValue('vehicleTypes', newTypes);
  };

  const handleSubmit = async (values: UserFormValues) => {
    await onSubmit({ ...values, vehicleTypes: selectedVehicleTypes }, user?.id, user?.auth_id);
    onOpenChange(false);
  };

  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      admin: 'Administrador',
      gestor: 'Gestor',
      motorista: 'Motorista',
      cliente: 'Cliente',
    };
    return labels[role];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do usuário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuário</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="Nome de usuário para login" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Mínimo 6 caracteres" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil de Acesso</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">{getRoleLabel('admin')}</SelectItem>
                      <SelectItem value="gestor">{getRoleLabel('gestor')}</SelectItem>
                      <SelectItem value="motorista">{getRoleLabel('motorista')}</SelectItem>
                      <SelectItem value="cliente">{getRoleLabel('cliente')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedRole === 'motorista' && (
              <div className="space-y-2">
                <FormLabel>Tipos de Veículo</FormLabel>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30 min-h-[42px]">
                  {selectedVehicleTypes.length > 0 ? (
                    selectedVehicleTypes.map((type) => (
                      <Badge
                        key={type}
                        variant="secondary"
                        className="flex items-center gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        onClick={() => toggleVehicleType(type)}
                      >
                        {type}
                        <X className="h-3 w-3" />
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Nenhum tipo selecionado</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {VEHICLE_TYPES.map((type) => (
                     <div key={type.value} className="flex items-center space-x-2 group">
                      <Checkbox
                        id={`vehicle-${type.value}`}
                        checked={selectedVehicleTypes.includes(type.value)}
                        onCheckedChange={() => toggleVehicleType(type.value)}
                      />
                      <label
                        htmlFor={`vehicle-${type.value}`}
                         className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {type.label}
                      </label>
                       <VehicleDetailsPopover vehicleType={type.value} triggerClassName="h-6 w-6 p-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;
