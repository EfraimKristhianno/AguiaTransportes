import { FileText } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { RequestForm } from '@/components/solicitacoes/RequestForm';
import { RequestList } from '@/components/solicitacoes/RequestList';
import { useAuth } from '@/contexts/AuthContext';
const Solicitacoes = () => {
  const {
    role
  } = useAuth();
  return <DashboardLayout title="Solicitações" subtitle={role === 'cliente' ? "Crie e acompanhe suas solicitações de coleta" : "Gerencie as solicitações de coleta"} icon={<FileText className="h-5 w-5" />}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 h-auto lg:h-[calc(100vh-180px)] mx-0">
        {/* Left side - Form */}
        <div className="overflow-auto">
          <RequestForm />
        </div>

        {/* Right side - Request List */}
        <div className="h-[500px] lg:h-full">
          <RequestList />
        </div>
      </div>
    </DashboardLayout>;
};
export default Solicitacoes;