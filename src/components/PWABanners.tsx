import { WifiOff, RefreshCw } from 'lucide-react';
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

  if (!isUpdateAvailable) return null;

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
      </div>
    </div>
  );
};

export { OfflineBanner, UpdateBanner };
