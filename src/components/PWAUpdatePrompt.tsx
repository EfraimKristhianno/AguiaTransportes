import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISSED_KEY = 'pwa-update-dismissed-ts';
const DISMISS_TTL = 24 * 60 * 60 * 1000; // 24 hours

const isDismissedRecently = (): boolean => {
  const ts = localStorage.getItem(DISMISSED_KEY);
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) < DISMISS_TTL;
};

const markDismissed = () => {
  localStorage.setItem(DISMISSED_KEY, String(Date.now()));
};

const PWAUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW() {},
    onRegisterError() {},
  });

  // Guard: don't show if dismissed recently
  if (!needRefresh || isDismissedRecently()) return null;

  const handleUpdate = () => {
    markDismissed();
    setNeedRefresh(false);
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    markDismissed();
    setNeedRefresh(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 bg-primary text-primary-foreground px-5 py-3 rounded-xl shadow-2xl border border-primary/20">
        <RefreshCw className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">Nova atualização disponível!</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleUpdate}
          className="ml-1 font-semibold"
        >
          Atualizar
        </Button>
        <button
          onClick={handleDismiss}
          className="ml-1 p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;
