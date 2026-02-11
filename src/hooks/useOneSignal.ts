import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = 'd34d96dd-731e-49c6-bee8-5c79b4291d81';

export const useOneSignal = () => {
  const { user, role } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || initialized.current) return;

    const initOneSignal = async () => {
      try {
        // Wait for SDK to be available
        const waitForOneSignal = (): Promise<any> => {
          return new Promise((resolve) => {
            // Check if OneSignal is already initialized
            if ((window as any).OneSignal && typeof (window as any).OneSignal.init === 'function') {
              resolve((window as any).OneSignal);
              return;
            }

            // Use the deferred queue
            (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
            (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
              resolve(OneSignal);
            });
          });
        };

        const OneSignal = await waitForOneSignal();
        
        if (initialized.current) return;
        initialized.current = true;

        // Initialize OneSignal
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: '/onesignal/' },
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          notifyButton: { enable: false },
        });

        console.log('[OneSignal] SDK initialized');

        // Request notification permission
        const permission = await OneSignal.Notifications.requestPermission();
        console.log('[OneSignal] Permission:', permission);

        // Login with external user ID - this is critical for targeting
        await OneSignal.login(user.id);
        console.log('[OneSignal] Logged in as:', user.id);

        // Set role tag for all users
        const tags: Record<string, string> = { role: role || 'unknown' };

        // If driver, add driver-specific tags
        if (role === 'motorista') {
          const { data: driver } = await supabase
            .from('drivers')
            .select('id, driver_vehicle_types(vehicle_type)')
            .eq('user_id', user.id)
            .single();

          if (driver) {
            tags.driver_id = driver.id;
            const vehicleTypes = driver.driver_vehicle_types?.map(
              (dvt: { vehicle_type: string }) => dvt.vehicle_type
            ) || [];
            tags.vehicle_types = vehicleTypes.join(',');
          }
        }

        await OneSignal.User.addTags(tags);
        console.log('[OneSignal] Tags set:', tags);
      } catch (error) {
        console.error('[OneSignal] Init error:', error);
        // Reset so it can retry
        initialized.current = false;
      }
    };

    // Small delay to ensure DOM and SDK script are loaded
    const timer = setTimeout(initOneSignal, 1500);
    return () => clearTimeout(timer);
  }, [user, role]);
};
