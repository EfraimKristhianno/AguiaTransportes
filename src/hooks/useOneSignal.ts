import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = 'd34d96dd-731e-49c6-bee8-5c79b4291d81';

export const useOneSignal = () => {
  const { user, role } = useAuth();
  const initialized = useRef(false);

  const setupOneSignal = useCallback(async () => {
    if (!user || role !== 'motorista') return;
    if (initialized.current) return;

    try {
      // Use the v16 deferred pattern - this is the ONLY correct way
      (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
      (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
        if (initialized.current) return;

        try {
          // Initialize SDK - v16 handles duplicate init gracefully
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerParam: { scope: '/' },
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            notifyButton: { enable: false },
            persistNotification: true,
            notificationClickHandlerMatch: 'origin',
            notificationClickHandlerAction: 'focus',
          });
          console.log('[OneSignal] SDK initialized via deferred pattern');

          // Login with external user ID FIRST (before permission request)
          // This ensures the device is linked to the user
          let loginSuccess = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await OneSignal.login(user.id);
              console.log(`[OneSignal] Logged in as: ${user.id} (attempt ${attempt})`);
              loginSuccess = true;
              break;
            } catch (loginErr) {
              console.warn(`[OneSignal] Login attempt ${attempt} failed:`, loginErr);
              await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
            }
          }

          if (!loginSuccess) {
            console.error('[OneSignal] All login attempts failed for user:', user.id);
          }

          // Check current permission state
          const currentPermission = OneSignal.Notifications?.permission;
          console.log('[OneSignal] Current permission:', currentPermission);

          // On iOS, requestPermission must be called from a user gesture
          // But we can still try - if denied, the user will need to use the bell or a button
          if (!currentPermission) {
            try {
              const permission = await OneSignal.Notifications.requestPermission();
              console.log('[OneSignal] Permission result:', permission);
            } catch (permErr) {
              console.warn('[OneSignal] Permission request failed (may need user gesture on iOS):', permErr);
            }
          }

          // Ensure push subscription is opted in
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const pushSub = OneSignal.User?.PushSubscription;
          console.log('[OneSignal] PushSubscription state:', {
            id: pushSub?.id,
            token: pushSub?.token ? 'present' : 'missing',
            optedIn: pushSub?.optedIn,
          });

          if (pushSub && !pushSub.optedIn) {
            try {
              await pushSub.optIn();
              console.log('[OneSignal] Manually opted in to push');
            } catch (e) {
              console.warn('[OneSignal] Opt-in failed:', e);
            }
          }

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
              user_id: user.id,
            });
            console.log('[OneSignal] Tags set for driver:', driver.id, 'vehicles:', vehicleTypes);
          }

          // Final verification
          await new Promise(resolve => setTimeout(resolve, 1500));
          const finalSub = OneSignal.User?.PushSubscription;
          console.log('[OneSignal] Final state:', {
            subscriptionId: finalSub?.id,
            optedIn: finalSub?.optedIn,
            externalId: OneSignal.User?.externalId,
            permission: OneSignal.Notifications?.permission,
          });

          initialized.current = true;
          console.log('[OneSignal] Setup complete for user:', user.id);
        } catch (error) {
          console.error('[OneSignal] Setup error inside deferred:', error);
        }
      });
    } catch (error) {
      console.error('[OneSignal] Error setting up deferred:', error);
    }
  }, [user, role]);

  useEffect(() => {
    if (!user || role !== 'motorista' || initialized.current) return;

    // Give the page time to load before initializing
    const timer = setTimeout(setupOneSignal, 1000);
    return () => clearTimeout(timer);
  }, [user, role, setupOneSignal]);

  // Reset on user change
  useEffect(() => {
    if (!user || role !== 'motorista') {
      initialized.current = false;
    }
  }, [user, role]);
};
