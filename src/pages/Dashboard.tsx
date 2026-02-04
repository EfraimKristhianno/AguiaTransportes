import { LayoutDashboard } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

const Dashboard = () => {
  return (
    <DashboardLayout 
      title="Dashboard" 
      subtitle="Visão geral do sistema"
      icon={<LayoutDashboard className="h-5 w-5" />}
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <LayoutDashboard className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Conteúdo do Dashboard será implementado aqui
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
