import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// VAPID public key - this is a publishable key, safe to store in code
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const useWebPush = () => {
  const { user, role } = useAuth();
  const initialized = useRef(false);

  const subscribe = useCallback(async () => {
    if (!user || role !== 'motorista') return;
    if (initialized.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[WebPush] Push not supported in this browser');
      return;
    }

    try {
      // Register the push service worker
      const registration = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      console.log('[WebPush] Service worker registered');

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[WebPush] Permission denied');
        return;
      }

      // Check for existing subscription
      const pm = (registration as any).pushManager;
      if (!pm) {
        console.warn('[WebPush] PushManager not available');
        return;
      }
      let subscription = await pm.getSubscription();

      // If no subscription or VAPID key changed, create a new one
      if (!subscription) {
        if (!VAPID_PUBLIC_KEY) {
          console.error('[WebPush] VAPID_PUBLIC_KEY not configured');
          return;
        }

        subscription = await pm.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        console.log('[WebPush] New subscription created');
      }

      // Extract keys from subscription
      const subJson = subscription.toJSON();
      const endpoint = subJson.endpoint!;
      const p256dh = subJson.keys!.p256dh!;
      const auth = subJson.keys!.auth!;

      // Save to Supabase (upsert by user_id + endpoint)
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            endpoint,
            p256dh,
            auth,
          },
          { onConflict: 'user_id,endpoint' }
        );

      if (error) {
        console.error('[WebPush] Error saving subscription:', error);
      } else {
        console.log('[WebPush] Subscription saved for user:', user.id);
      }

      initialized.current = true;
    } catch (error) {
      console.error('[WebPush] Error:', error);
    }
  }, [user, role]);

  useEffect(() => {
    if (!user || role !== 'motorista' || initialized.current) return;
    const timer = setTimeout(subscribe, 1500);
    return () => clearTimeout(timer);
  }, [user, role, subscribe]);

  useEffect(() => {
    if (!user || role !== 'motorista') {
      initialized.current = false;
    }
  }, [user, role]);
};
