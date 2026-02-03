import { Download, CheckCircle, Smartphone, Zap, WifiOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';
import { useNavigate } from 'react-router-dom';
import logoAguia from '@/assets/logo-aguia.png';

const Install = () => {
  const { canInstall, isInstalled, isIOS, isAndroid, installApp } = usePWA();
  const navigate = useNavigate();

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      navigate('/');
    }
  };

  const features = [
    {
      icon: Zap,
      title: 'Acesso Rápido',
      description: 'Abra o app direto da tela inicial',
    },
    {
      icon: WifiOff,
      title: 'Funciona Offline',
      description: 'Use mesmo sem conexão à internet',
    },
    {
      icon: Shield,
      title: 'Seguro',
      description: 'Seus dados protegidos localmente',
    },
    {
      icon: Smartphone,
      title: 'Experiência Nativa',
      description: 'Interface otimizada para mobile',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="hero-gradient px-6 pb-12 pt-16 text-center">
        <div className="mx-auto mb-6 flex h-24 w-48 items-center justify-center rounded-2xl bg-white/95 p-4">
          <img 
            src={logoAguia} 
            alt="Águia Transportes" 
            className="h-full w-full object-contain"
          />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">
          Instale o Águia Transportes
        </h1>
        <p className="text-white/80">
          Tenha acesso rápido ao sistema de logística
        </p>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-md px-6 py-8">
        {isInstalled ? (
          <div className="mb-8 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <h2 className="mb-2 text-lg font-bold text-green-800">
              App já instalado!
            </h2>
            <p className="mb-4 text-green-700">
              O Águia Transportes já está na sua tela inicial.
            </p>
            <Button
              onClick={() => navigate('/')}
              className="btn-gradient text-primary-foreground"
            >
              Abrir App
            </Button>
          </div>
        ) : (
          <>
            {/* Features */}
            <div className="mb-8 grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <feature.icon className="mb-2 h-8 w-8 text-primary" />
                  <h3 className="font-medium text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Install Button or Instructions */}
            {isIOS ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-bold text-foreground">
                  Como instalar no iPhone/iPad
                </h2>
                <ol className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      1
                    </span>
                    <div>
                      <p className="font-medium text-foreground">
                        Toque no ícone de compartilhar
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Na barra inferior do Safari
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      2
                    </span>
                    <div>
                      <p className="font-medium text-foreground">
                        Role para baixo e selecione
                      </p>
                      <p className="text-sm text-muted-foreground">
                        "Adicionar à Tela Inicial"
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      3
                    </span>
                    <div>
                      <p className="font-medium text-foreground">
                        Confirme a instalação
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Toque em "Adicionar"
                      </p>
                    </div>
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
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <p className="text-muted-foreground">
                  {isAndroid
                    ? 'Acesse o menu do navegador (⋮) e selecione "Instalar app"'
                    : 'Use o menu do navegador para adicionar à tela inicial'}
                </p>
              </div>
            )}
          </>
        )}

        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Voltar para login
        </button>
      </div>
    </div>
  );
};

export default Install;
