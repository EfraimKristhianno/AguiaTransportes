import { useState } from 'react';
import { Truck, MapPin, Users } from 'lucide-react';
import FeatureCard from '@/components/FeatureCard';
import LoginForm from '@/components/LoginForm';
import RegisterForm from '@/components/RegisterForm';

const Index = () => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleMode = () => setIsLogin(!isLogin);

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Hero */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-center px-12 xl:px-20">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Truck className="h-10 w-10 text-white" />
          </div>

          {/* Brand */}
          <h1 className="mb-2 text-4xl font-bold text-white">AguiaLog</h1>
          <p className="mb-12 text-lg text-white/90">Sistema de Controle Logístico</p>

          {/* Features */}
          <div className="space-y-4">
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
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full items-center justify-center bg-background px-6 lg:w-1/2">
        {/* Mobile header */}
        <div className="absolute left-0 top-0 w-full hero-gradient p-6 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AguiaLog</h1>
              <p className="text-sm text-white/80">Sistema de Controle Logístico</p>
            </div>
          </div>
        </div>

        <div className="mt-32 w-full max-w-md lg:mt-0">
          {isLogin ? (
            <LoginForm onToggleMode={toggleMode} />
          ) : (
            <RegisterForm onToggleMode={toggleMode} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
