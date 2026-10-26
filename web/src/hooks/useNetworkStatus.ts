'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';

export interface NetworkStatus {
  isOnline: boolean;
  isSocketConnected: boolean;
  isReconnecting: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const { status, isConnected } = useWebSocket();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isSocketConnected: isConnected,
    isReconnecting: isOnline && !isConnected && status === 'connecting',
  };
}
