'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Radio, Users, Square, Clock } from 'lucide-react';
import { OSM_TILE_LAYER_URL, OSM_ATTRIBUTION } from '@/lib/mapTiles';
import { createLiveMarkerIcon } from './LiveMarkerAvatar';
import { formatRemainingTime } from '@/lib/geoMath';
import { useWebSocket } from '@/context/WebSocketContext';
import MultiUserMapViewer from './MultiUserMapViewer';

export interface LiveLocationBubbleProps {
  liveLocationId: string;
  chatId: string;
  initialLatitude: number;
  initialLongitude: number;
  initialHeading?: number | null;
  comment?: string | null;
  expiresAt: string | Date;
  senderId: string;
  senderName?: string;
  senderAvatarUrl?: string | null;
  currentUserId: string;
  timestamp?: string;
  isOutgoing?: boolean;
}

export default function LiveLocationBubble({
  liveLocationId,
  chatId,
  initialLatitude,
  initialLongitude,
  initialHeading = null,
  comment,
  expiresAt,
  senderId,
  senderName = 'User',
  senderAvatarUrl,
  currentUserId,
}: LiveLocationBubbleProps) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; heading?: number | null }>({
    latitude: initialLatitude,
    longitude: initialLongitude,
    heading: initialHeading,
  });
  const [isEnded, setIsEnded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isStopping, setIsStopping] = useState(false);
  const [isGroupMapOpen, setIsGroupMapOpen] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const { subscribe, send } = useWebSocket();
  const isSelf = senderId === currentUserId;

  // 1. Calculate remaining time and expiry countdown
  useEffect(() => {
    const updateTime = () => {
      const remaining = formatRemainingTime(expiresAt);
      if (remaining.isExpired) {
        setIsEnded(true);
        setTimeRemaining('Live location ended');
      } else {
        setTimeRemaining(remaining.text);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // 2. Real-time WebSocket updates for this live location session
  useEffect(() => {
    const unsubUpdate = subscribe('location:live_updated', (payload: any) => {
      if (payload.liveLocationId === liveLocationId) {
        setCoords({
          latitude: payload.latitude,
          longitude: payload.longitude,
          heading: payload.heading,
        });
      }
    });

    const unsubStop = subscribe('location:live_stopped', (payload: any) => {
      if (payload.liveLocationId === liveLocationId) {
        setIsEnded(true);
      }
    });

    const unsubEnded = subscribe('location:live_ended', (payload: any) => {
      if (payload.liveLocationId === liveLocationId) {
        setIsEnded(true);
      }
    });

    return () => {
      unsubUpdate();
      unsubStop();
      unsubEnded();
    };
  }, [liveLocationId, subscribe]);

  // 3. Initialize or update Leaflet mini-map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let map = leafletMapRef.current;

    async function setupMap() {
      const L = (await import('leaflet')).default;
      if (!mapContainerRef.current) return;

      if (!map) {
        map = L.map(mapContainerRef.current, {
          center: [coords.latitude, coords.longitude],
          zoom: 16,
          zoomControl: false,
          dragging: false,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          attributionControl: false,
        });

        L.tileLayer(OSM_TILE_LAYER_URL, {
          attribution: OSM_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(map);

        leafletMapRef.current = map;
      } else {
        map.setView([coords.latitude, coords.longitude], 16, { animate: true });
      }

      const icon = createLiveMarkerIcon(L, {
        avatarUrl: senderAvatarUrl,
        name: senderName,
        heading: coords.heading,
        isSelf,
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([coords.latitude, coords.longitude]);
        markerRef.current.setIcon(icon);
      } else {
        const marker = L.marker([coords.latitude, coords.longitude], { icon }).addTo(map);
        markerRef.current = marker;
      }

      setTimeout(() => {
        map?.invalidateSize();
      }, 200);
    }

    setupMap();
  }, [coords, senderAvatarUrl, senderName, isSelf]);

  const handleStopSharing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStopping(true);
    try {
      send({
        type: 'location:live_stop',
        payload: {
          liveLocationId,
          chatId,
        },
      });

      await fetch('/api/location/live/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liveLocationId }),
      });

      setIsEnded(true);
    } catch (err) {
      console.error('Failed to stop live location:', err);
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <>
      <div className="w-[280px] sm:w-[320px] rounded-2xl overflow-hidden shadow-xs select-none">
        {/* Map Viewport Area */}
        <div
          onClick={() => setIsGroupMapOpen(true)}
          className={`relative w-full h-[180px] bg-[#e5e3df] dark:bg-[#1f2c34] overflow-hidden cursor-pointer group ${
            isEnded ? 'grayscale contrast-75' : ''
          }`}
        >
          <div ref={mapContainerRef} className="w-full h-full pointer-events-none" />

          {/* Floating Live Badge */}
          <div className="absolute top-2.5 left-2.5 z-10">
            {isEnded ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 text-white/80 text-[10px] font-semibold backdrop-blur-xs">
                <span>Live ended</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600/90 text-white text-[10px] font-semibold shadow-xs backdrop-blur-xs">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>LIVE</span>
              </span>
            )}
          </div>

          {/* View Full Map Hint Pill */}
          <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-white text-[10px] font-medium backdrop-blur-xs">
              <Users className="w-3 h-3 text-[#00a884]" />
              <span>Full Map</span>
            </span>
          </div>
        </div>

        {/* Details & Controls Card */}
        <div className="p-3 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex flex-col gap-2">
          {/* Sender & Comment */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary leading-tight truncate">
                {isSelf ? 'You are sharing live location' : `${senderName}'s Live Location`}
              </p>
              {comment && (
                <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate mt-0.5">
                  &ldquo;{comment}&rdquo;
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsGroupMapOpen(true)}
              className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[#00a884]/15 hover:text-[#00a884] text-wa-light-text-secondary transition-colors cursor-pointer shrink-0"
              title="Open Collaborative Group Map"
            >
              <Users className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Footer Countdown & Action */}
          <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center gap-1.5 text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              <Clock className="w-3.5 h-3.5 text-[#00a884]" />
              <span>{timeRemaining}</span>
            </div>

            {isSelf && !isEnded && (
              <button
                type="button"
                disabled={isStopping}
                onClick={handleStopSharing}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>{isStopping ? 'Stopping...' : 'Stop Sharing'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collaborative Full Map Modal */}
      {isGroupMapOpen && (
        <MultiUserMapViewer
          isOpen={isGroupMapOpen}
          chatId={chatId}
          currentUserId={currentUserId}
          currentUserCoords={coords}
          onClose={() => setIsGroupMapOpen(false)}
        />
      )}
    </>
  );
}
