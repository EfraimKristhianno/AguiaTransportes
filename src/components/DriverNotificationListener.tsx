import { useAuth } from '@/contexts/AuthContext';
import { useDriverNotifications } from '@/hooks/useDriverNotifications';

const DriverNotificationListenerInner = () => {
  useDriverNotifications();
  return null;
};

const DriverNotificationListener = () => {
  const { role, user } = useAuth();

  if (!user || role !== 'motorista') return null;

  return <DriverNotificationListenerInner />;
};

export default DriverNotificationListener;
