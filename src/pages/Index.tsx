import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Download } from 'lucide-react';
import FeatureCard from '@/components/FeatureCard';
import LoginForm from '@/components/LoginForm';
import RegisterForm from '@/components/RegisterForm';
import InstallPrompt from '@/components/InstallPrompt';
import { usePWA } from '@/hooks/usePWA';
import { useAuth } from '@/contexts/AuthContext';
import logoAguia from '@/assets/logo-aguia.png';

const Index = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const { canInstall, isInstalled, isIOS } = usePWA();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const toggleMode = () => setIsLogin(!isLogin);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Show install prompt after 3 seconds if not installed
  useEffect(() => {
    if (!isInstalled && (canInstall || isIOS)) {
      const timer = setTimeout(() => {
        const hasSeenPrompt = localStorage.getItem('installPromptSeen');
        if (!hasSeenPrompt) {
          setShowInstallPrompt(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled, isIOS]);

  const handleClosePrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('installPromptSeen', 'true');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Hero */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-center px-12 xl:px-20">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-6 flex h-40 w-80 items-center justify-center rounded-2xl bg-white/95 p-2 backdrop-blur-sm">
            <img 
              src={logoAguia} 
              alt="Águia Transportes" 
              className="h-full w-full object-contain"
            />
          </div>

          {/* Brand */}
          <p className="mb-12 text-xl font-medium text-white/90">Sistema de Controle Logístico</p>

          {/* Features */}
          <div className="w-full max-w-md space-y-4">
            <FeatureCard
              icon={MapPin}
              title="Rastreamento em tempo real"
              description="Acompanhe suas entregas ao vivo"
            />
            <FeatureCard
              icon={Users}
              title="Múltiplos perfis"
              description="Admin, gestor, motorista e cliente"
            />
          </div>

          {/* Install hint */}
          {(canInstall || isIOS) && !isInstalled && (
            <button
              onClick={() => setShowInstallPrompt(true)}
              className="mt-8 flex items-center gap-2 rounded-lg bg-white/20 px-4 py-3 text-white transition-colors hover:bg-white/30"
            >
              <Download className="h-5 w-5" />
              <span>Instalar aplicativo</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full items-center justify-center bg-background px-6 lg:w-1/2">
        {/* Mobile header */}
        <div className="absolute left-0 top-0 w-full hero-gradient p-6 lg:hidden">
          <div className="flex items-center justify-center">
            <div className="flex h-24 w-48 items-center justify-center rounded-xl bg-white/95 p-1">
              <img 
                src={logoAguia} 
                alt="Águia Transportes" 
                className="h-full w-full object-contain"
              />
            </div>
          </div>
          {/* Mobile install button */}
          {(canInstall || isIOS) && !isInstalled && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setShowInstallPrompt(true)}
                className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-sm text-white"
              >
                <Download className="h-4 w-4" />
                <span>Instalar app</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-36 w-full max-w-md lg:mt-0">
          {isLogin ? (
            <LoginForm onToggleMode={toggleMode} />
          ) : (
            <RegisterForm onToggleMode={toggleMode} />
          )}
        </div>
      </div>

      {/* Install Prompt Modal */}
      {showInstallPrompt && (
        <InstallPrompt onClose={handleClosePrompt} />
      )}
    </div>
  );
};

export default Index;
