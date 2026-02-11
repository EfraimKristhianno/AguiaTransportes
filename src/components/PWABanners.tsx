import { useState } from 'react';
import { WifiOff, RefreshCw, Bell, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';

const OfflineBanner = () => {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-yellow-500 px-4 py-2 text-center text-sm font-medium text-yellow-900">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>Você está offline. Algumas funcionalidades podem estar limitadas.</span>
      </div>
    </div>
  );
};

const UpdateBanner = () => {
  const { isUpdateAvailable, updateApp } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!isUpdateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary px-4 py-3 text-center">
      <div className="flex items-center justify-center gap-4">
        <span className="text-sm font-medium text-primary-foreground">
          Uma nova versão está disponível!
        </span>
        <Button
          onClick={updateApp}
          size="sm"
          variant="secondary"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
        <Button
          onClick={() => setDismissed(true)}
          size="sm"
          variant="ghost"
          className="text-primary-foreground hover:text-primary-foreground/80 p-1 h-auto"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const NotificationPermissionBanner = () => {
  const { notificationPermission, requestNotificationPermission } = usePWA();

  if (notificationPermission !== 'default') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary px-4 py-3 text-center">
      <div className="flex items-center justify-center gap-4">
        <Bell className="h-4 w-4 text-primary-foreground" />
        <span className="text-sm font-medium text-primary-foreground">
          Ative as notificações para receber alertas de novas solicitações
        </span>
        <Button
          onClick={requestNotificationPermission}
          size="sm"
          variant="secondary"
          className="gap-2"
        >
          Ativar
        </Button>
      </div>
    </div>
  );
};

export { OfflineBanner, UpdateBanner, NotificationPermissionBanner };
