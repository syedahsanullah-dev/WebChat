'use client';

import React from 'react';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';
import { formatCoordinates, getNavigationUrls } from '@/lib/mapTiles';

export interface StaticLocationBubbleProps {
  latitude: number;
  longitude: number;
  locationAddress?: string | null;
  timestamp?: string;
  isOutgoing?: boolean;
}

export default function StaticLocationBubble({
  latitude,
  longitude,
  locationAddress,
  timestamp,
  isOutgoing = false,
}: StaticLocationBubbleProps) {
  const formattedCoords = formatCoordinates(latitude, longitude);
  const navUrls = getNavigationUrls(latitude, longitude);

  // OpenStreetMap embed URL with marker pin ($0 cost, 100% open-source)
  const deltaLat = 0.003;
  const deltaLng = 0.005;
  const bbox = `${longitude - deltaLng}%2C${latitude - deltaLat}%2C${longitude + deltaLng}%2C${latitude + deltaLat}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  const handleOpenMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(navUrls.googleMaps, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-[270px] sm:w-[300px] rounded-xl overflow-hidden shadow-xs cursor-pointer select-none group" onClick={handleOpenMaps}>
      {/* Map Thumbnail Frame */}
      <div className="relative w-full h-[150px] bg-[#e5e3df] dark:bg-[#1f2c34] overflow-hidden pointer-events-none">
        <iframe
          title="Location Map Preview"
          src={embedUrl}
          className="w-full h-full border-0 pointer-events-none"
          loading="lazy"
          tabIndex={-1}
        />
        {/* Floating Open Pill */}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-xs opacity-90 group-hover:opacity-100 transition-opacity">
          <Navigation className="w-3 h-3 text-[#00a884]" />
          <span>Open Map</span>
        </div>
      </div>

      {/* Address & Navigation Details */}
      <div className="p-3 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-[#00a884] shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary leading-tight truncate">
              {locationAddress || 'Shared Location'}
            </p>
            <p className="text-[10px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary font-mono mt-0.5">
              {formattedCoords}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5 mt-1">
          <span className="text-[10px] text-[#00a884] font-medium hover:underline flex items-center gap-1">
            <span>Get Directions</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </span>

          <span className="text-[9px] text-wa-light-text-secondary opacity-75">
            OpenStreetMap
          </span>
        </div>
      </div>
    </div>
  );
}
