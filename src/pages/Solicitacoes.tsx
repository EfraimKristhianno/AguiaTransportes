import { FileText } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

const Solicitacoes = () => {
  return (
    <DashboardLayout 
      title="Solicitações" 
      subtitle="Gerencie as solicitações de coleta"
      icon={<FileText className="h-5 w-5" />}
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Conteúdo das Solicitações será implementado aqui
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Solicitacoes;
