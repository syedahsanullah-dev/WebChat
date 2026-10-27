'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { computeDistanceMeters } from '@/lib/geoMath';

export interface UseLiveLocationTrackerProps {
  chatId: string;
  liveLocationId: string | null;
  isSharing: boolean;
  onStopSharing?: () => void;
}

export interface LiveCoords {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
}

const MIN_DISPLACEMENT_METERS = 10;
const THROTTLE_INTERVAL_MS = 8000;

export function useLiveLocationTracker({
  chatId,
  liveLocationId,
  isSharing,
  onStopSharing,
}: UseLiveLocationTrackerProps) {
  const { send } = useWebSocket();
  const [currentCoords, setCurrentCoords] = useState<LiveCoords | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastEmittedCoordsRef = useRef<LiveCoords | null>(null);
  const lastEmittedTimeRef = useRef<number>(0);

  const emitLocationUpdate = useCallback(
    (coords: LiveCoords) => {
      if (!liveLocationId || !chatId) return;

      send({
        type: 'location:live_update',
        payload: {
          liveLocationId,
          chatId,
          latitude: coords.latitude,
          longitude: coords.longitude,
          heading: coords.heading ?? null,
          speed: coords.speed ?? null,
          accuracy: coords.accuracy ?? null,
        },
      });

      lastEmittedCoordsRef.current = coords;
      lastEmittedTimeRef.current = Date.now();
    },
    [chatId, liveLocationId, send]
  );

  const handlePositionChange = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude, heading, speed, accuracy } = position.coords;
      const coords: LiveCoords = { latitude, longitude, heading, speed, accuracy };

      setCurrentCoords(coords);
      setError(null);

      const now = Date.now();
      const lastCoords = lastEmittedCoordsRef.current;
      const lastTime = lastEmittedTimeRef.current;

      if (!lastCoords) {
        // Emit immediately on first acquired position
        emitLocationUpdate(coords);
        return;
      }

      const displacement = computeDistanceMeters(
        lastCoords.latitude,
        lastCoords.longitude,
        coords.latitude,
        coords.longitude
      );
      const timeElapsed = now - lastTime;

      // Battery-friendly throttling: emit only if displacement > 10m OR time >= 8s
      if (displacement >= MIN_DISPLACEMENT_METERS || timeElapsed >= THROTTLE_INTERVAL_MS) {
        emitLocationUpdate(coords);
      }
    },
    [emitLocationUpdate]
  );

  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError('Location permission denied. Please allow access in browser settings.');
        break;
      case err.POSITION_UNAVAILABLE:
        setError('GPS position unavailable.');
        break;
      case err.TIMEOUT:
        setError('GPS request timed out.');
        break;
      default:
        setError('An unknown error occurred while retrieving GPS location.');
    }
  }, []);

  useEffect(() => {
    if (!isSharing || !liveLocationId) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionChange,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isSharing, liveLocationId, handlePositionChange, handlePositionError]);

  const stopSharing = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (liveLocationId && chatId) {
      send({
        type: 'location:live_stop',
        payload: {
          liveLocationId,
          chatId,
        },
      });

      try {
        await fetch('/api/location/live/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ liveLocationId }),
        });
      } catch (err) {
        console.error('Failed to notify stop live location API:', err);
      }
    }

    if (onStopSharing) onStopSharing();
  }, [chatId, liveLocationId, send, onStopSharing]);

  return {
    currentCoords,
    error,
    stopSharing,
  };
}
