import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Car } from 'lucide-react';
import DriverVehicleView from '@/components/veiculos/DriverVehicleView';
import ManagerVehicleView from '@/components/veiculos/ManagerVehicleView';
import AdminVehicleView from '@/components/veiculos/AdminVehicleView';

const Veiculos = () => {
  const { role } = useAuth();

  const getSubtitle = () => {
    if (role === 'motorista') return 'Registros do seu veículo';
    if (role === 'gestor' || role === 'assistente_logistico') return 'Indicadores e gráficos da frota';
    return 'Dashboard completo da frota';
  };

  return (
    <DashboardLayout title="Veículos" subtitle={getSubtitle()} icon={<Car className="h-6 w-6" />}>
      {role === 'motorista' && <DriverVehicleView />}
      {(role === 'gestor' || role === 'admin') && <AdminVehicleView />}
    </DashboardLayout>
  );
};

export default Veiculos;
