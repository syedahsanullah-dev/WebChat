'use client';

import { useState, useEffect, useCallback } from 'react';

const DISMISS_KEY = 'webchat_pwa_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  // Check if currently running in standalone PWA window
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    const media = window.matchMedia('(display-mode: standalone)');
    const onChange = () => checkStandalone();
    media.addEventListener?.('change', onChange);

    return () => {
      media.removeEventListener?.('change', onChange);
    };
  }, []);

  // Listen for Chrome beforeinstallprompt event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION_MS) {
        return;
      } else {
        localStorage.removeItem(DISMISS_KEY);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      deferredPrompt = null;
      setIsInstallable(false);
      setIsStandalone(true);
      console.log('[PWA] WebChat was successfully installed as an app.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger Chrome Native Install Dialog
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstallable(false);
        deferredPrompt = null;
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[PWA] Error displaying install prompt:', err);
      return false;
    }
  }, []);

  // Dismiss banner for 7 days
  const dismissInstall = useCallback(() => {
    setIsInstallable(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
      } catch {
        // Swallowed safely
      }
    }
  }, []);

  return {
    isInstallable: isInstallable && !isStandalone,
    isStandalone,
    installApp,
    dismissInstall,
  };
}
