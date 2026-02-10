import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = 'd34d96dd-731e-49c6-bee8-5c79b4291d81';

export const useOneSignal = () => {
  const { user, role } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || role !== 'motorista' || initialized.current) return;

    const initOneSignal = async () => {
      try {
        // Wait for OneSignal SDK to load
        const OneSignal = (window as any).OneSignalDeferred || [];
        
        (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
        (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
          if (initialized.current) return;
          initialized.current = true;

          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerParam: { scope: '/onesignal/' },
            serviceWorkerPath: '/OneSignalSDKWorker.js',
          });

          // Set external user ID for targeting
          await OneSignal.login(user.id);

          // Fetch driver's vehicle types and set as tags
          const { data: driver } = await supabase
            .from('drivers')
            .select('id, driver_vehicle_types(vehicle_type)')
            .eq('user_id', user.id)
            .single();

          if (driver) {
            const vehicleTypes = driver.driver_vehicle_types?.map(
              (dvt: { vehicle_type: string }) => dvt.vehicle_type
            ) || [];

            // Set tags for targeting
            await OneSignal.User.addTags({
              role: 'motorista',
              driver_id: driver.id,
              vehicle_types: vehicleTypes.join(','),
            });
          }

          console.log('[OneSignal] Initialized for driver:', user.id);
        });
      } catch (error) {
        console.error('[OneSignal] Init error:', error);
      }
    };

    initOneSignal();
  }, [user, role]);
};
