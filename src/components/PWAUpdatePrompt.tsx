import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PWAUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 bg-primary text-primary-foreground px-5 py-3 rounded-xl shadow-2xl border border-primary/20">
        <RefreshCw className="h-5 w-5 animate-spin-slow shrink-0" />
        <span className="text-sm font-medium">Nova atualização disponível!</span>
        <Button
          size="sm"
          variant="secondary"
         onClick={async () => {
           // Limpar todos os caches antes de atualizar
           if ('caches' in window) {
             const names = await caches.keys();
             await Promise.all(names.map(name => caches.delete(name)));
           }
           setNeedRefresh(false);
           updateServiceWorker(true);
         }}
          className="ml-1 font-semibold"
        >
          Atualizar
        </Button>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;
