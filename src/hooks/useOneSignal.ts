import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = 'd34d96dd-731e-49c6-bee8-5c79b4291d81';

export const useOneSignal = () => {
  const { user, role } = useAuth();
  const initialized = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  const initOneSignal = useCallback(async () => {
    if (!user || role !== 'motorista') return;
    if (initialized.current) return;

    try {
      const OneSignalSDK = (window as any).OneSignal;

      // SDK v16 uses a deferred queue pattern — if it's not ready yet, enqueue
      if (!OneSignalSDK) {
        console.warn('[OneSignal] SDK not loaded yet, retrying...');
        if (retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          setTimeout(initOneSignal, 2000 * retryCount.current);
        }
        return;
      }

      // If OneSignal is still an array (deferred queue), push our init into it
      if (Array.isArray(OneSignalSDK)) {
        (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
        (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
          await performInit(OneSignal);
        });
        return;
      }

      // SDK already loaded as object — use it directly
      await performInit(OneSignalSDK);
    } catch (error) {
      console.error('[OneSignal] Init error:', error);
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        setTimeout(initOneSignal, 2000 * retryCount.current);
      }
    }
  }, [user, role]);

  const performInit = async (OneSignal: any) => {
    if (initialized.current || !user) return;

    try {
      // Check if already initialized by testing if Notifications exists
      const isAlreadyInitialized = OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function';

      if (!isAlreadyInitialized) {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: '/' },
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          notifyButton: { enable: false },
          persistNotification: true,
        });
        console.log('[OneSignal] SDK initialized');
      } else {
        console.log('[OneSignal] SDK was already initialized');
      }

      // Request permission
      const permission = await OneSignal.Notifications.requestPermission();
      console.log('[OneSignal] Permission:', permission);

      if (!permission) {
        console.warn('[OneSignal] Notification permission denied');
        initialized.current = true;
        return;
      }

      // Login with external user ID
      await OneSignal.login(user.id);
      console.log('[OneSignal] Logged in as:', user.id);

      // Wait a moment for login to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify the subscription is active
      const isPushEnabled = OneSignal.User?.PushSubscription?.optedIn;
      console.log('[OneSignal] Push opted in:', isPushEnabled);

      // Set tags for driver targeting
      const { data: driver } = await supabase
        .from('drivers')
        .select('id, driver_vehicle_types(vehicle_type)')
        .eq('user_id', user.id)
        .single();

      if (driver) {
        const vehicleTypes = driver.driver_vehicle_types?.map(
          (dvt: { vehicle_type: string }) => dvt.vehicle_type
        ) || [];

        await OneSignal.User.addTags({
          role: 'motorista',
          driver_id: driver.id,
          vehicle_types: vehicleTypes.join(','),
        });
        console.log('[OneSignal] Tags set for driver:', driver.id, 'vehicles:', vehicleTypes);
      }

      initialized.current = true;
      retryCount.current = 0;
      console.log('[OneSignal] Setup complete for user:', user.id);
    } catch (error) {
      console.error('[OneSignal] performInit error:', error);
      // Don't mark as initialized so it can retry
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        setTimeout(() => performInit(OneSignal), 2000 * retryCount.current);
      }
    }
  };

  useEffect(() => {
    if (!user || role !== 'motorista' || initialized.current) return;

    // Reset retry count on new mount
    retryCount.current = 0;

    // Give the SDK script time to load
    const timer = setTimeout(initOneSignal, 1500);
    return () => clearTimeout(timer);
  }, [user, role, initOneSignal]);

  // Re-login when user changes (e.g., re-auth)
  useEffect(() => {
    if (!user || role !== 'motorista') {
      initialized.current = false;
    }
  }, [user, role]);
};
