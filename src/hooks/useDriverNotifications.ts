import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCurrentDriver } from './useDriverRequests';

function playNotificationSound() {
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {
      // Fallback: generate a beep using Web Audio API
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.5);
      } catch {}
    });
  } catch {}
}

export const useDriverNotifications = () => {
  const queryClient = useQueryClient();
  const { data: driver } = useCurrentDriver();
  const driverVehicleTypes = useRef<string[]>([]);

  // Keep vehicle types in ref to avoid re-subscribing
  useEffect(() => {
    if (driver?.driver_vehicle_types) {
      driverVehicleTypes.current = driver.driver_vehicle_types.map(
        (dvt: { vehicle_type: string }) => dvt.vehicle_type
      );
    }
  }, [driver]);

  useEffect(() => {
    if (!driver?.id) return;

    const channel = supabase
      .channel('driver-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_requests',
        },
        (payload) => {
          const newRequest = payload.new as any;
          const types = driverVehicleTypes.current;

          // Only notify if transport_type matches driver's vehicle types
          if (
            types.length > 0 &&
            newRequest.transport_type &&
            types.includes(newRequest.transport_type) &&
            ['solicitada', 'enviada'].includes(newRequest.status || '')
          ) {
            const title = 'Nova solicitação disponível!';
            const body = `De: ${newRequest.origin_address}\nPara: ${newRequest.destination_address}`;

            // Toast notification
            toast.info(title, {
              description: body,
              duration: 8000,
            });

            // Play notification sound
            playNotificationSound();

            // Native notification
            showNativeNotification(title, body);

            // Refresh the list
            queryClient.invalidateQueries({ queryKey: ['driverRequests'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_requests',
        },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;

          // Notify if status changed to solicitada/enviada and matches transport type
          if (
            old.status !== updated.status &&
            ['solicitada', 'enviada'].includes(updated.status || '') &&
            driverVehicleTypes.current.includes(updated.transport_type)
          ) {
            toast.info('Solicitação atualizada', {
              description: `#${updated.request_number} está disponível`,
              duration: 6000,
            });

            // Play notification sound
            playNotificationSound();

            showNativeNotification(
              'Solicitação atualizada',
              `#${updated.request_number} está disponível para aceite`
            );
          }

          // Always refresh on any update to keep list current
          queryClient.invalidateQueries({ queryKey: ['driverRequests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver?.id, queryClient]);
};

function showNativeNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Use service worker if available for background notifications
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body,
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        tag: 'driver-notification',
        silent: false,
        requireInteraction: true,
      });
    });
  } else {
    new Notification(title, {
      body,
      icon: '/logo-192.png',
      silent: false,
      requireInteraction: true,
    });
  }
}
