import { Users } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

const Usuarios = () => {
  return (
    <DashboardLayout 
      title="Usuários" 
      subtitle="Gerencie os usuários do sistema"
      icon={<Users className="h-5 w-5" />}
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Conteúdo de Usuários será implementado aqui
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Usuarios;
