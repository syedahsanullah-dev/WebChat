import { NextRequest, NextResponse } from 'next/server';
import { nominatimCache } from '@/lib/nominatimCache';

const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ||
  'WebChat/1.0 (support@webchat.local; https://github.com/webchat/webchat)';

/**
 * Formats OpenStreetMap addressdetails into a clean, concise string
 */
function formatOsmAddress(data: any): string {
  if (!data) return 'Current Location';

  const addr = data.address;
  if (!addr) {
    return data.display_name?.split(',').slice(0, 3).join(', ') || 'Current Location';
  }

  const parts: string[] = [];

  // Street number and road or POI
  const poi = addr.amenity || addr.shop || addr.building || addr.tourism || addr.leisure;
  const road = addr.road || addr.street || addr.pedestrian || addr.footway;
  const houseNumber = addr.house_number;

  if (poi) {
    parts.push(poi);
  }

  if (road) {
    parts.push(houseNumber ? `${houseNumber} ${road}` : road);
  }

  // Neighborhood / Suburb
  const neighborhood = addr.neighbourhood || addr.suburb || addr.quarter;
  if (neighborhood && !parts.includes(neighborhood)) {
    parts.push(neighborhood);
  }

  // City / Town
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.county;
  if (city && !parts.includes(city)) {
    parts.push(city);
  }

  // State / Country
  const state = addr.state || addr.country;
  if (state && !parts.includes(state)) {
    parts.push(state);
  }

  return parts.length > 0 ? parts.slice(0, 3).join(', ') : data.display_name || 'Current Location';
}

/**
 * GET /api/location/reverse-geocode?lat=...&lng=...
 * Reverse geocodes GPS coordinates into human-readable street addresses with LRU caching.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');

    if (!latParam || !lngParam) {
      return NextResponse.json(
        { error: 'Query parameters lat and lng are required' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude values' },
        { status: 400 }
      );
    }

    // 1. Check in-memory LRU Cache
    const cachedAddress = nominatimCache.get(lat, lng);
    if (cachedAddress) {
      return NextResponse.json({
        success: true,
        address: cachedAddress,
        lat,
        lng,
        cached: true,
      });
    }

    // 2. Fetch from OpenStreetMap Nominatim ($0 cost)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let address = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;

    try {
      const osmRes = await fetch(url, {
        headers: {
          'User-Agent': NOMINATIM_USER_AGENT,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (osmRes.ok) {
        const osmData = await osmRes.json();
        const formatted = formatOsmAddress(osmData);
        if (formatted) {
          address = formatted;
        }
      }
    } catch (err) {
      // Non-fatal if Nominatim rate-limits or times out
      console.warn('[ReverseGeocode] Nominatim lookup fallback:', (err as Error).message);
    } finally {
      clearTimeout(timeoutId);
    }

    // 3. Store in LRU cache
    nominatimCache.set(lat, lng, address);

    return NextResponse.json({
      success: true,
      address,
      lat,
      lng,
      cached: false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal geocoding error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
