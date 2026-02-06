import { FileText } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { RequestForm } from '@/components/solicitacoes/RequestForm';
import { RequestList } from '@/components/solicitacoes/RequestList';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Solicitacoes = () => {
  const { role } = useAuth();
  
  // Motoristas não têm acesso à tela de Solicitações - redirecionar para Motoristas
  if (role === 'motorista') {
    return <Navigate to="/motoristas" replace />;
  }

  return (
    <DashboardLayout 
      title="Solicitações" 
      subtitle={role === 'cliente' ? "Crie e acompanhe suas solicitações de coleta" : "Gerencie as solicitações de coleta"}
      icon={<FileText className="h-5 w-5" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
        {/* Left side - Form */}
        <div className="overflow-auto">
          <RequestForm />
        </div>

        {/* Right side - Request List */}
        <div className="h-full">
          <RequestList />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Solicitacoes;
