import { useAuth } from '@/contexts/AuthContext';
import { useDriverNotifications } from '@/hooks/useDriverNotifications';
import { useOneSignal } from '@/hooks/useOneSignal';

const DriverNotificationListenerInner = () => {
  useDriverNotifications();
  return null;
};

const OneSignalInitializer = () => {
  useOneSignal();
  return null;
};

const DriverNotificationListener = () => {
  const { role, user } = useAuth();

  if (!user) return null;

  return (
    <>
      <OneSignalInitializer />
      {role === 'motorista' && <DriverNotificationListenerInner />}
    </>
  );
};

export default DriverNotificationListener;
