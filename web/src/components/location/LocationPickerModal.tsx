'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Navigation, RefreshCw, AlertCircle, MapPin, Send } from 'lucide-react';
import { useGeolocation, GeolocationCoordinates } from '@/hooks/useGeolocation';
import { OSM_TILE_LAYER_URL, OSM_ATTRIBUTION, formatCoordinates } from '@/lib/mapTiles';

export interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendLocation: (location: {
    latitude: number;
    longitude: number;
    locationAddress?: string;
  }) => void;
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSendLocation,
}: LocationPickerModalProps) {
  const { coords, error, isLoading, requestLocation } = useGeolocation();
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  // When modal opens, acquire location if not yet available
  useEffect(() => {
    if (isOpen && !coords && !isLoading) {
      requestLocation();
    }
  }, [isOpen, coords, isLoading, requestLocation]);

  // When coordinates change, fetch reverse geocoded address
  useEffect(() => {
    if (!coords) return;

    let isMounted = true;
    setIsResolvingAddress(true);

    fetch(`/api/location/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data.success && data.address) {
            setResolvedAddress(data.address);
          } else {
            setResolvedAddress(formatCoordinates(coords.latitude, coords.longitude));
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setResolvedAddress(formatCoordinates(coords.latitude, coords.longitude));
        }
      })
      .finally(() => {
        if (isMounted) setIsResolvingAddress(false);
      });

    return () => {
      isMounted = false;
    };
  }, [coords]);

  // Initialize or update Leaflet map on client
  useEffect(() => {
    if (!isOpen || !coords || !mapContainerRef.current) return;

    let mapInstance = leafletMapRef.current;

    async function initOrUpdateMap() {
      const L = (await import('leaflet')).default;

      if (!mapContainerRef.current) return;

      if (!mapInstance) {
        mapInstance = L.map(mapContainerRef.current, {
          center: [coords!.latitude, coords!.longitude],
          zoom: 16,
          zoomControl: false,
        });

        // Add custom zoom control top right
        L.control.zoom({ position: 'topright' }).addTo(mapInstance);

        // Add OpenStreetMap raster tiles
        L.tileLayer(OSM_TILE_LAYER_URL, {
          attribution: OSM_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(mapInstance);

        leafletMapRef.current = mapInstance;
      } else {
        mapInstance.setView([coords!.latitude, coords!.longitude], 16);
      }

      // Clear existing markers
      mapInstance.eachLayer((layer: any) => {
        if (layer instanceof L.Circle || layer instanceof L.CircleMarker) {
          mapInstance.removeLayer(layer);
        }
      });

      // Add accuracy circle
      if (coords!.accuracy) {
        L.circle([coords!.latitude, coords!.longitude], {
          radius: coords!.accuracy,
          fillColor: '#00a884',
          color: '#00a884',
          weight: 1,
          opacity: 0.35,
          fillOpacity: 0.12,
        }).addTo(mapInstance);
      }

      // Add blue/green pulsating user pin
      L.circleMarker([coords!.latitude, coords!.longitude], {
        radius: 9,
        fillColor: '#00a884',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.95,
      }).addTo(mapInstance);

      // Invalidate map size after container transition
      setTimeout(() => {
        mapInstance?.invalidateSize();
      }, 200);
    }

    initOrUpdateMap();

    return () => {
      if (!isOpen && mapInstance) {
        mapInstance.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isOpen, coords]);

  // Clean up on unmount or modal close
  useEffect(() => {
    if (!isOpen && leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!coords) return;
    onSendLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      locationAddress: resolvedAddress || formatCoordinates(coords.latitude, coords.longitude),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-[520px] max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e9edef] dark:border-white/10 bg-wa-light-header dark:bg-wa-dark-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#00a884]/15 text-[#00a884] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary">
                Send Current Location
              </h2>
              <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                Zero-Cost OpenStreetMap GPS Positioning
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-wa-light-text-secondary hover:text-wa-light-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Viewport Area */}
        <div className="flex-1 relative bg-[#e5e3df] dark:bg-[#1f2c34] overflow-hidden">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-xs text-rose-600 dark:text-rose-400 bg-rose-50/90 dark:bg-rose-950/40">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p className="font-medium max-w-xs">{error}</p>
              <button
                type="button"
                onClick={() => requestLocation()}
                className="mt-3 px-4 py-2 rounded-lg bg-[#00a884] text-white font-semibold text-xs flex items-center gap-2 shadow-xs hover:bg-[#008f6f] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          ) : isLoading || !coords ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-wa-light-bg/80 dark:bg-wa-dark-bg/80 text-wa-light-text-secondary">
              <div className="w-7 h-7 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Acquiring high-accuracy GPS coordinates...</p>
            </div>
          ) : (
            <>
              <div ref={mapContainerRef} className="w-full h-full z-0" />
              {/* Re-center button */}
              <button
                type="button"
                onClick={() => requestLocation()}
                className="absolute bottom-4 right-4 z-10 p-2.5 rounded-full bg-white dark:bg-[#111b21] shadow-lg text-wa-light-text-primary dark:text-wa-dark-text-primary border border-black/10 dark:border-white/10 hover:bg-black/5 transition-transform active:scale-95"
                title="Re-acquire current location"
              >
                <Navigation className="w-4 h-4 text-[#00a884]" />
              </button>
            </>
          )}
        </div>

        {/* Bottom Card & Send Action */}
        <div className="p-4 border-t border-[#e9edef] dark:border-white/10 bg-wa-light-sidebar dark:bg-wa-dark-sidebar flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-[#00a884] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
                {isResolvingAddress ? 'Resolving street address...' : resolvedAddress || 'Current Location'}
              </p>
              {coords && (
                <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-0.5">
                  {formatCoordinates(coords.latitude, coords.longitude)}
                  {coords.accuracy && (
                    <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                      • Accurate to {coords.accuracy}m
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-wa-light-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!coords || isLoading}
              onClick={handleSend}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Your Current Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
