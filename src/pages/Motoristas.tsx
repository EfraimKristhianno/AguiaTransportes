import { useState, useEffect } from 'react';
import { Truck as TruckIcon, CheckCircle, Clock, Search, Package, MapPin, Bell } from 'lucide-react';
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
import { useDriverNotifications } from '@/hooks/useDriverNotifications';
import { supabase } from '@/integrations/supabase/client';
import { DriverTrackingDialog } from '@/components/motoristas/DriverTrackingDialog';

const Motoristas = () => {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [trackingDriver, setTrackingDriver] = useState<{ id: string; name: string; activeDeliveries: number } | null>(null);
  useRealtimeDeliveryRequests();
  const { data: drivers, isLoading } = useDrivers();
  
  const isDriver = role === 'motorista';
  useDriverNotifications(isDriver);
  
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

  const getStatusBadge = (activeDeliveries: number) => {
    if (activeDeliveries > 0) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600 text-white border-green-500">
          Online
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="bg-destructive hover:bg-destructive/90">
        Offline
      </Badge>
    );
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
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!isDriver) return;
    // Check if already subscribed via push or notification permission
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.getRegistration('/sw-push.js').then((reg) => {
        if (reg) {
          reg.pushManager.getSubscription().then((sub) => {
            if (sub) setIsSubscribed(true);
          });
        }
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      setIsSubscribed(true);
    }
  }, [isDriver]);

  const handleEnableNotifications = async () => {
    setIsSubscribed(true); // Instant UI feedback

    try {
      // 1. Get VAPID public key from edge function
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-key');
      if (vapidError || !vapidData?.publicKey) {
        console.error('Failed to get VAPID key:', vapidError);
        return;
      }

      // 2. Register push service worker
      const registration = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;

      // 3. Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setIsSubscribed(false);
        return;
      }

      // 4. Subscribe to push
      const publicKeyBytes = Uint8Array.from(
        atob(vapidData.publicKey.replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0)
      );

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKeyBytes,
      });

      const subJson = subscription.toJSON();

      // 5. Save subscription to Supabase
      if (user) {
        await (supabase as any).from('push_subscriptions').upsert({
          user_id: user.id,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
        }, { onConflict: 'user_id,endpoint' });
      }

      console.log('[Push] Subscription saved successfully');
    } catch (err) {
      console.error('[Push] Error setting up push notifications:', err);
    }
  };

  if (isDriver) {
    const availableRequests = driverRequests.length;

    return (
      <DashboardLayout 
        title="Minhas Corridas" 
        subtitle={!isSubscribed ? 'Ativar notificações' : 'Visualize e aceite solicitações de coleta'}
        icon={<TruckIcon className="h-5 w-5" />}
        headerAction={
          !isSubscribed ? (
            <Button size="sm" onClick={handleEnableNotifications} className="shrink-0">
              <Bell className="h-4 w-4 mr-1" />
              Ativar
            </Button>
          ) : (
            <Button size="sm" disabled className="shrink-0 bg-muted text-muted-foreground cursor-default hover:bg-muted">
              <Bell className="h-4 w-4 mr-1" />
              Ativo
            </Button>
          )
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
