import { useAuth } from '@/contexts/AuthContext';
import { useDriverNotifications } from '@/hooks/useDriverNotifications';
import { useWebPush } from '@/hooks/useWebPush';

const DriverNotificationListenerInner = () => {
  useDriverNotifications();
  useWebPush();
  return null;
};

const DriverNotificationListener = () => {
  const { role, user } = useAuth();

  if (!user || role !== 'motorista') return null;

  return <DriverNotificationListenerInner />;
};

export default DriverNotificationListener;
