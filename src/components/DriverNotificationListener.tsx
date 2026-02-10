import { useAuth } from '@/contexts/AuthContext';
import { useDriverNotifications } from '@/hooks/useDriverNotifications';
import { useOneSignal } from '@/hooks/useOneSignal';

const DriverNotificationListenerInner = () => {
  useDriverNotifications();
  useOneSignal();
  return null;
};

const DriverNotificationListener = () => {
  const { role, user } = useAuth();

  if (!user || role !== 'motorista') return null;

  return <DriverNotificationListenerInner />;
};

export default DriverNotificationListener;
