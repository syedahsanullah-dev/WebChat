'use client';

import { useState, useCallback, useEffect } from 'react';

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface UseGeolocationReturn {
  coords: GeolocationCoordinates | null;
  error: string | null;
  isLoading: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unknown';
  requestLocation: () => Promise<GeolocationCoordinates | null>;
  clearError: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');

  // Check initial permission state if Permissions API is supported
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          setPermissionState(status.state as any);
          status.onchange = () => {
            setPermissionState(status.state as any);
          };
        })
        .catch(() => {
          // Fallback
        });
    }
  }, []);

  const requestLocation = useCallback(async (): Promise<GeolocationCoordinates | null> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords: GeolocationCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
          };
          setCoords(newCoords);
          setPermissionState('granted');
          setIsLoading(false);
          resolve(newCoords);
        },
        (err) => {
          let errorMsg = 'Failed to retrieve current location.';
          if (err.code === err.PERMISSION_DENIED) {
            errorMsg = 'Location permission was denied. Please allow location access in your browser settings.';
            setPermissionState('denied');
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            errorMsg = 'Location information is currently unavailable.';
          } else if (err.code === err.TIMEOUT) {
            errorMsg = 'Location request timed out. Please check your GPS signal and try again.';
          }

          setError(errorMsg);
          setIsLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    coords,
    error,
    isLoading,
    permissionState,
    requestLocation,
    clearError,
  };
}
