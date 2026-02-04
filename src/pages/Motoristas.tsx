import { Truck as TruckIcon } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

const Motoristas = () => {
  return (
    <DashboardLayout 
      title="Motoristas" 
      subtitle="Gerencie os motoristas do sistema"
      icon={<TruckIcon className="h-5 w-5" />}
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <TruckIcon className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Conteúdo de Motoristas será implementado aqui
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Motoristas;
