/**
 * Leaflet & OpenStreetMap Tile Provider Configuration
 * 100% Free Open-Source mapping ($0.00 / mo, NO Google Maps API key, NO Mapbox billing)
 */

export const OSM_TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export const DEFAULT_MAP_ZOOM = 16;

/**
 * Formats decimal latitude/longitude into human-readable cardinal degrees
 * e.g. 40.7128, -74.0060 -> "40.7128° N, 74.0060° W"
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/**
 * Generates universal routing/navigation URLs for cross-platform navigation
 */
export function getNavigationUrls(lat: number, lng: number) {
  return {
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    openStreetMap: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
    appleMaps: `https://maps.apple.com/?q=${lat},${lng}`,
  };
}
