import type L from 'leaflet';

export interface LiveMarkerOptions {
  avatarUrl?: string | null;
  name?: string;
  heading?: number | null;
  isSelf?: boolean;
}

/**
 * Creates a custom HTML Leaflet DivIcon with avatar image, pulsing radar wave, and directional heading arrow.
 */
export function createLiveMarkerIcon(
  leaflet: typeof L,
  options: LiveMarkerOptions
): L.DivIcon {
  const { avatarUrl, name = 'User', heading = null, isSelf = false } = options;
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const borderColor = isSelf ? '#00a884' : '#3b82f6';
  const pulseColor = isSelf ? 'rgba(0, 168, 132, 0.4)' : 'rgba(59, 130, 246, 0.4)';

  const avatarContent = avatarUrl
    ? `<img src="${avatarUrl}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`
    : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: #ffffff; background: #202c33; border-radius: 50%;">${initials}</div>`;

  const headingArrow =
    typeof heading === 'number'
      ? `<div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%) rotate(${heading}deg); transform-origin: center bottom; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 10px solid ${borderColor}; z-index: 10;"></div>`
      : '';

  const html = `
    <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
      <!-- Pulsing Aura Ring -->
      <div style="position: absolute; inset: -4px; border-radius: 50%; background: ${pulseColor}; animation: livePulse 2s infinite ease-out;"></div>
      <!-- Heading Arrow -->
      ${headingArrow}
      <!-- Avatar Bubble -->
      <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; border: 3px solid ${borderColor}; box-shadow: 0 4px 10px rgba(0,0,0,0.3); overflow: hidden; background: #111b21; z-index: 5;">
        ${avatarContent}
      </div>
    </div>
    <style>
      @keyframes livePulse {
        0% { transform: scale(0.9); opacity: 0.8; }
        70% { transform: scale(1.4); opacity: 0; }
        100% { transform: scale(1.4); opacity: 0; }
      }
    </style>
  `;

  return leaflet.divIcon({
    html,
    className: 'custom-live-marker',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}
