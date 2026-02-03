import { X, Download, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';
import logoAguia from '@/assets/logo-aguia.png';

interface InstallPromptProps {
  onClose: () => void;
}

const InstallPrompt = ({ onClose }: InstallPromptProps) => {
  const { canInstall, isIOS, installApp } = usePWA();

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md animate-in slide-in-from-bottom-4 rounded-2xl bg-card p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="mb-4 flex justify-center">
          <img 
            src={logoAguia} 
            alt="Águia Transportes" 
            className="h-16 w-auto object-contain"
          />
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-xl font-bold text-foreground">
          Instale o App
        </h2>
        <p className="mb-6 text-center text-muted-foreground">
          Tenha acesso rápido ao sistema de logística direto da sua tela inicial
        </p>

        {/* Benefits */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Acesso offline</p>
              <p className="text-sm text-muted-foreground">Use mesmo sem internet</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Ícone na tela</p>
              <p className="text-sm text-muted-foreground">Abra com um toque</p>
            </div>
          </div>
        </div>

        {/* Install instructions */}
        {isIOS ? (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-3 text-sm font-medium text-foreground">
              Para instalar no iPhone/iPad:
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span>
                Toque no ícone <Share className="inline h-4 w-4" /> compartilhar
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">2</span>
                Role e toque em "Adicionar à Tela Inicial"
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">3</span>
                Confirme tocando em "Adicionar"
              </li>
            </ol>
          </div>
        ) : canInstall ? (
          <Button
            onClick={handleInstall}
            className="btn-gradient w-full text-primary-foreground shadow-[var(--shadow-button)]"
            size="lg"
          >
            <Download className="mr-2 h-5 w-5" />
            Instalar Agora
          </Button>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-center text-sm text-muted-foreground">
              Para instalar, acesse o menu do navegador e selecione "Instalar app" ou "Adicionar à tela inicial"
            </p>
          </div>
        )}

        {/* Close link */}
        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Agora não
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
