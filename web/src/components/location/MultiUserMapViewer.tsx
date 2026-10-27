'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Users, Navigation, Radio, MapPin } from 'lucide-react';
import { LiveLocationData } from '@shared/types';
import { OSM_TILE_LAYER_URL, OSM_ATTRIBUTION } from '@/lib/mapTiles';
import { createLiveMarkerIcon } from './LiveMarkerAvatar';
import { computeDistanceMeters, formatDistance } from '@/lib/geoMath';
import { useWebSocket } from '@/context/WebSocketContext';

export interface MultiUserMapViewerProps {
  isOpen: boolean;
  chatId: string;
  chatTitle?: string;
  currentUserId: string;
  currentUserCoords?: { latitude: number; longitude: number } | null;
  onClose: () => void;
}

export default function MultiUserMapViewer({
  isOpen,
  chatId,
  chatTitle,
  currentUserId,
  currentUserCoords,
  onClose,
}: MultiUserMapViewerProps) {
  const [liveLocations, setLiveLocations] = useState<LiveLocationData[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const { subscribe } = useWebSocket();

  // 1. Fetch initial active live locations
  useEffect(() => {
    if (!isOpen || !chatId) return;

    fetch(`/api/chats/${chatId}/live-locations`)
      .then((res) => res.json())
      .then((data) => {
        if (data.liveLocations) {
          setLiveLocations(data.liveLocations);
        }
      })
      .catch((err) => console.error('Failed to load group live locations:', err));
  }, [isOpen, chatId]);

  // 2. Subscribe to real-time live location updates
  useEffect(() => {
    if (!isOpen || !chatId) return;

    const unsubUpdate = subscribe('location:live_updated', (payload: any) => {
      if (payload.chatId !== chatId) return;
      setLiveLocations((prev) =>
        prev.map((loc) =>
          loc.id === payload.liveLocationId
            ? {
                ...loc,
                latitude: payload.latitude,
                longitude: payload.longitude,
                heading: payload.heading,
                speed: payload.speed,
                accuracy: payload.accuracy,
                updatedAt: payload.updatedAt,
              }
            : loc
        )
      );
    });

    const unsubStart = subscribe('location:live_started', (payload: any) => {
      if (payload?.liveLocation?.chatId !== chatId) return;
      setLiveLocations((prev) => {
        const exists = prev.some((l) => l.id === payload.liveLocation.id);
        if (exists) return prev;
        return [payload.liveLocation, ...prev];
      });
    });

    const unsubStop = subscribe('location:live_stopped', (payload: any) => {
      if (payload.chatId !== chatId) return;
      setLiveLocations((prev) => prev.filter((l) => l.id !== payload.liveLocationId));
    });

    const unsubEnded = subscribe('location:live_ended', (payload: any) => {
      if (payload.chatId !== chatId) return;
      setLiveLocations((prev) => prev.filter((l) => l.id !== payload.liveLocationId));
    });

    return () => {
      unsubUpdate();
      unsubStart();
      unsubStop();
      unsubEnded();
    };
  }, [isOpen, chatId, subscribe]);

  // 3. Initialize or update Leaflet map and markers
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let map = leafletMapRef.current;

    async function setupMap() {
      const L = (await import('leaflet')).default;
      if (!mapContainerRef.current) return;

      if (!map) {
        // Default center
        const defaultCenter: [number, number] =
          liveLocations.length > 0
            ? [liveLocations[0].latitude, liveLocations[0].longitude]
            : currentUserCoords
            ? [currentUserCoords.latitude, currentUserCoords.longitude]
            : [0, 0];

        map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 15,
          zoomControl: false,
        });

        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer(OSM_TILE_LAYER_URL, {
          attribution: OSM_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(map);

        leafletMapRef.current = map;
      }

      // Update or add markers for all active locations
      const activeIds = new Set<string>();

      liveLocations.forEach((loc) => {
        activeIds.add(loc.id);
        const isSelf = loc.userId === currentUserId;
        const icon = createLiveMarkerIcon(L, {
          avatarUrl: loc.userAvatarUrl,
          name: loc.userDisplayName,
          heading: loc.heading,
          isSelf,
        });

        if (markersRef.current.has(loc.id)) {
          const marker = markersRef.current.get(loc.id);
          marker.setLatLng([loc.latitude, loc.longitude]);
          marker.setIcon(icon);
        } else {
          const marker = L.marker([loc.latitude, loc.longitude], { icon })
            .addTo(map)
            .bindPopup(
              `<div style="font-size: 12px; font-weight: 600;">${loc.userDisplayName}</div>${
                loc.comment ? `<div style="font-size: 11px; color: #8696a0;">${loc.comment}</div>` : ''
              }`
            );
          markersRef.current.set(loc.id, marker);
        }
      });

      // Remove stale markers
      markersRef.current.forEach((marker, id) => {
        if (!activeIds.has(id)) {
          map.removeLayer(marker);
          markersRef.current.delete(id);
        }
      });

      // Fit bounds to show all markers
      if (liveLocations.length > 1) {
        const bounds = L.latLngBounds(
          liveLocations.map((l) => [l.latitude, l.longitude] as [number, number])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } else if (liveLocations.length === 1) {
        map.setView([liveLocations[0].latitude, liveLocations[0].longitude], 16);
      }

      setTimeout(() => {
        map?.invalidateSize();
      }, 200);
    }

    setupMap();

    return () => {
      if (!isOpen && map) {
        map.remove();
        leafletMapRef.current = null;
        markersRef.current.clear();
      }
    };
  }, [isOpen, liveLocations, currentUserId, currentUserCoords]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
      <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[650px] max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e9edef] dark:border-white/10 bg-wa-light-header dark:bg-wa-dark-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00a884]/15 text-[#00a884] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary">
                  {chatTitle || 'Collaborative Live Map'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-[#00a884]">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  <span>{liveLocations.length} Sharing</span>
                </span>
              </div>
              <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                Auto-centering bounds with participant distance calculations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-wa-light-text-secondary hover:text-wa-light-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Map + Sidebar Participant Panel */}
        <div className="flex-1 flex flex-col sm:flex-row relative overflow-hidden">
          {/* Map Area */}
          <div className="flex-1 relative bg-[#e5e3df] dark:bg-[#1f2c34]">
            {liveLocations.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-wa-light-text-secondary text-xs p-6 text-center">
                <MapPin className="w-8 h-8 text-wa-light-text-muted" />
                <p>No active live locations currently sharing in this conversation.</p>
              </div>
            ) : (
              <div ref={mapContainerRef} className="w-full h-full z-0" />
            )}
          </div>

          {/* Participant List Panel */}
          <div className="w-full sm:w-72 bg-wa-light-sidebar dark:bg-wa-dark-sidebar border-t sm:border-t-0 sm:border-l border-[#e9edef] dark:border-white/10 flex flex-col max-h-48 sm:max-h-full overflow-y-auto p-3 space-y-2">
            <h3 className="text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary px-1">
              Active Members ({liveLocations.length})
            </h3>

            {liveLocations.map((loc) => {
              const isSelf = loc.userId === currentUserId;
              let distanceStr = '';
              if (currentUserCoords && !isSelf) {
                const distMeters = computeDistanceMeters(
                  currentUserCoords.latitude,
                  currentUserCoords.longitude,
                  loc.latitude,
                  loc.longitude
                );
                distanceStr = `${formatDistance(distMeters)} away`;
              }

              return (
                <div
                  key={loc.id}
                  onClick={() => {
                    setSelectedUser(loc.userId);
                    leafletMapRef.current?.setView([loc.latitude, loc.longitude], 17);
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedUser === loc.userId
                      ? 'bg-[#00a884]/10 border-[#00a884]'
                      : 'bg-white dark:bg-[#111b21] border-[#e9edef] dark:border-white/10 hover:border-[#00a884]/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-black/10 shrink-0">
                      {loc.userAvatarUrl ? (
                        <img
                          src={loc.userAvatarUrl}
                          alt={loc.userDisplayName || 'User'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white bg-[#00a884]">
                          {(loc.userDisplayName || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00a884] ring-2 ring-white dark:ring-[#111b21]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
                        {loc.userDisplayName} {isSelf && '(You)'}
                      </p>
                      {loc.comment && (
                        <p className="text-[10px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate">
                          {loc.comment}
                        </p>
                      )}
                    </div>
                  </div>

                  {distanceStr && (
                    <span className="text-[10px] font-semibold text-[#00a884] shrink-0 ml-2">
                      {distanceStr}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
