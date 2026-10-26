'use client';

import { useState, useEffect, useCallback } from 'react';

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

export interface UseWebPushReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  isLoading: boolean;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
}

export function useWebPush(): UseWebPushReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check support and current subscription status on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (!supported) {
      setPermission('unsupported');
      setIsLoading(false);
      return;
    }

    setPermission(Notification.permission);

    async function checkExistingSubscription() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(Boolean(subscription));
      } catch (err) {
        console.warn('[useWebPush] Failed to check existing push subscription:', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkExistingSubscription();
  }, []);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsLoading(true);

    try {
      // 1. Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        setIsLoading(false);
        return false;
      }

      // 2. Fetch VAPID public key
      let vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        const res = await fetch('/api/push/vapid-public-key');
        if (res.ok) {
          const data = await res.json();
          vapidPublicKey = data.publicKey;
        }
      }

      if (!vapidPublicKey) {
        throw new Error('VAPID public key not available');
      }

      // 3. Register service worker and subscribe via PushManager
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey as unknown as BufferSource,
        });
      }

      // 4. Send subscription to server
      const subJson = subscription.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to save subscription on server: ${res.statusText}`);
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('[useWebPush] Subscription error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch((e) => console.warn('[useWebPush] Server unsubscribe error (non-fatal):', e));

        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('[useWebPush] Unsubscription error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
