import { useState, useEffect } from 'react';
import { Truck as TruckIcon, CheckCircle, Clock, Search, Package, MapPin, Bell, BellOff } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useDrivers } from '@/hooks/useDrivers';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentDriver, useDriverRequests } from '@/hooks/useDriverRequests';
import { DriverRequestsTable } from '@/components/motoristas/DriverRequestsTable';
import { useRealtimeDeliveryRequests } from '@/hooks/useRealtimeDeliveryRequests';
import { DriverTrackingDialog } from '@/components/motoristas/DriverTrackingDialog';

const Motoristas = () => {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [trackingDriver, setTrackingDriver] = useState<{ id: string; name: string; activeDeliveries: number } | null>(null);
  useRealtimeDeliveryRequests();
  const { data: drivers, isLoading } = useDrivers();
  
  const isDriver = role === 'motorista';
  
  // Driver-specific data
  const { data: currentDriver, isLoading: isLoadingDriver } = useCurrentDriver();
  const driverVehicleTypes = currentDriver?.driver_vehicle_types?.map((dvt: { vehicle_type: string }) => dvt.vehicle_type) || [];
  const { data: driverRequests = [], isLoading: isLoadingRequests } = useDriverRequests(driverVehicleTypes, currentDriver?.id);

  const filteredDrivers = drivers?.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalDrivers = drivers?.length || 0;
  const totalCompleted = drivers?.reduce((acc, d) => acc + d.completed_deliveries, 0) || 0;
  const totalActive = drivers?.reduce((acc, d) => acc + d.active_deliveries, 0) || 0;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      available: { label: 'Disponível', variant: 'outline' },
      busy: { label: 'Em Trânsito', variant: 'default' },
      offline: { label: 'Offline', variant: 'secondary' },
    };
    const config = statusConfig[status] || statusConfig.offline;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Driver view - show available requests matching their transport types
  // Notification permission state for driver
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [showNotifBanner, setShowNotifBanner] = useState(true);

  useEffect(() => {
    if (isDriver) {
      if ('Notification' in window) {
        setNotifPermission(Notification.permission);
        if (Notification.permission === 'granted') {
          setShowNotifBanner(false);
        }
      }
      // On iOS Safari (non-PWA), Notification may not exist — still show banner
    }
  }, [isDriver]);

  const handleEnableNotifications = async () => {
    try {
      const OneSignal = (window as any).OneSignal;
      if (OneSignal) {
        // Use OneSignal's permission request (works on all platforms)
        await OneSignal.Notifications.requestPermission();
        
        const granted = 'Notification' in window ? Notification.permission === 'granted' : true;
        console.log('[OneSignal] Permission after request:', granted);
        
        if (granted) {
          // Re-login and tag to ensure subscription is linked
          const { supabase } = await import('@/integrations/supabase/client');
          const userResponse = await supabase.auth.getUser();
          if (userResponse.data?.user) {
            const userId = userResponse.data.user.id;
            await OneSignal.login(userId);
            await OneSignal.User.addTags({ role: 'motorista' });
            console.log('[OneSignal] Driver subscribed and tagged successfully');
          }
          setNotifPermission('granted');
          setShowNotifBanner(false);
        } else {
          setNotifPermission('Notification' in window ? Notification.permission : 'denied');
        }
      } else if ('Notification' in window) {
        const result = await Notification.requestPermission();
        setNotifPermission(result);
        if (result === 'granted') setShowNotifBanner(false);
      }
    } catch (e) {
      console.error('Error requesting notification permission:', e);
    }
  };

  if (isDriver) {
    const availableRequests = driverRequests.length;

    return (
      <DashboardLayout 
        title="Minhas Corridas" 
        subtitle={showNotifBanner && notifPermission !== 'granted' ? 'Ativar notificações' : 'Visualize e aceite solicitações de coleta'}
        icon={<TruckIcon className="h-5 w-5" />}
        headerAction={
          showNotifBanner && notifPermission !== 'granted' && notifPermission !== 'denied' ? (
            <Button size="sm" onClick={handleEnableNotifications} className="shrink-0">
              <Bell className="h-4 w-4 mr-1" />
              Ativar
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-6">
          {/* Stats Cards for Driver */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {isLoadingRequests ? '-' : availableRequests}
                  </p>
                  <p className="text-sm text-muted-foreground">Solicitações Disponíveis</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <TruckIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{driverVehicleTypes.length}</p>
                  <p className="text-sm text-muted-foreground">Tipos de Veículo</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seus veículos</p>
                  <p className="text-sm font-medium">
                    {driverVehicleTypes.join(', ') || '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Driver Requests Table */}
          {isLoadingDriver ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <span className="text-muted-foreground">Carregando...</span>
                </div>
              </CardContent>
            </Card>
          ) : !currentDriver ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <TruckIcon className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Seu perfil de motorista ainda não foi vinculado.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Entre em contato com o administrador.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <DriverRequestsTable
              requests={driverRequests}
              isLoading={isLoadingRequests}
              driverId={currentDriver.id}
            />
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Admin/Gestor view - show all drivers
  return (
    <DashboardLayout 
      title="Gestão de Motoristas" 
      subtitle="Acompanhe o desempenho e as corridas dos motoristas"
      icon={<TruckIcon className="h-5 w-5" />}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TruckIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '-' : totalDrivers}</p>
                <p className="text-sm text-muted-foreground">Motoristas</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '-' : totalCompleted}</p>
                <p className="text-sm text-muted-foreground">Entregas Concluídas</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '-' : totalActive}</p>
                <p className="text-sm text-muted-foreground">Corridas Ativas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Drivers Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motorista</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Concluídas</TableHead>
                  <TableHead className="text-center">Ativas</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Rastrear</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                       <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                       <TableCell><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                       <TableCell><Skeleton className="h-8 w-8 mx-auto" /></TableCell>
                     </TableRow>
                  ))
                ) : filteredDrivers.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={6} className="h-24 text-center">
                      <p className="text-muted-foreground">
                        {searchTerm ? 'Nenhum motorista encontrado' : 'Nenhum motorista cadastrado'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 bg-primary/10">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {getInitials(driver.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{driver.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{driver.total_deliveries}</TableCell>
                      <TableCell className="text-center font-medium">
                        {driver.completed_deliveries}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {driver.active_deliveries}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(driver.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        {driver.active_deliveries > 0 ? (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setTrackingDriver({ id: driver.id, name: driver.name, activeDeliveries: driver.active_deliveries })}
                            title="Rastrear motorista"
                          >
                            <MapPin className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {trackingDriver && (
          <DriverTrackingDialog
            open={!!trackingDriver}
            onOpenChange={(open) => !open && setTrackingDriver(null)}
            driverId={trackingDriver.id}
            driverName={trackingDriver.name}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Motoristas;
