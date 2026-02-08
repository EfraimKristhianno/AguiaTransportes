import { useState } from 'react';
import { FileText } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { RequestForm } from '@/components/solicitacoes/RequestForm';
import { RequestList } from '@/components/solicitacoes/RequestList';
import { useAuth } from '@/contexts/AuthContext';
import { RequestSearchBar } from '@/components/shared/RequestSearchBar';

const Solicitacoes = () => {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  return (
    <DashboardLayout
      title="Solicitações"
      subtitle={role === 'cliente' ? "Crie e acompanhe suas solicitações de coleta" : "Gerencie as solicitações de coleta"}
      icon={<FileText className="h-5 w-5" />}
    >
      <div className="flex flex-col gap-4 md:gap-6 mx-0">
        <RequestForm />

        <RequestSearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
        />

        <div className="h-[500px]">
          <RequestList searchTerm={searchTerm} statusFilter={statusFilter} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Solicitacoes;
