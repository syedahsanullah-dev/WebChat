'use client';

import { useEffect, useRef } from 'react';

/**
 * Screen Wake Lock API hook (Phase 40)
 * Prevents mobile display sleep and CPU throttling during active voice calls.
 * Automatically handles re-acquisition when returning to the tab and releases
 * immediately upon call termination.
 */
export function useScreenWakeLock(isActive: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!isActive || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let released = false;

    async function requestLock() {
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (!released) {
          wakeLockRef.current = sentinel;
          sentinel.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        } else {
          sentinel.release().catch(() => {});
        }
      } catch (err) {
        console.warn('[useScreenWakeLock] WakeLock acquisition failed:', err);
      }
    }

    requestLock();

    // Re-acquire lock if user switches back to tab while call is still active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current && !released) {
        requestLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isActive]);
}
