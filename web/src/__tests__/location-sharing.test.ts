import { describe, it, expect, beforeEach } from 'vitest';
import { NominatimLruCache } from '@/lib/nominatimCache';
import { formatCoordinates, getNavigationUrls } from '@/lib/mapTiles';

describe('Phase 37: Current Static GPS Location Sharing', () => {
  describe('1. Nominatim LRU Cache & Bucket Keys', () => {
    let cache: NominatimLruCache;

    beforeEach(() => {
      cache = new NominatimLruCache(3, 1000); // Max 3 items, 1 second TTL
    });

    it('generates 100-meter grid bucket keys with 3-decimal precision', () => {
      const key1 = cache.generateKey(40.71284, -74.00599);
      const key2 = cache.generateKey(40.71281, -74.00602);
      const keyFar = cache.generateKey(40.72000, -74.01000);

      // Coordinates within ~100m bucket resolve to same key
      expect(key1).toBe('40.713,-74.006');
      expect(key2).toBe('40.713,-74.006');
      expect(key1).toBe(key2);
      expect(key1).not.toBe(keyFar);
    });

    it('caches and retrieves addresses correctly', () => {
      cache.set(40.7128, -74.006, '5th Avenue, New York');
      expect(cache.get(40.7128, -74.006)).toBe('5th Avenue, New York');
      expect(cache.get(51.5074, -0.1278)).toBeNull();
    });

    it('evicts oldest entries when capacity is exceeded', () => {
      cache.set(1, 1, 'Location 1');
      cache.set(2, 2, 'Location 2');
      cache.set(3, 3, 'Location 3');

      expect(cache.size()).toBe(3);

      // Adding 4th item should evict oldest (Location 1)
      cache.set(4, 4, 'Location 4');
      expect(cache.size()).toBe(3);
      expect(cache.get(1, 1)).toBeNull();
      expect(cache.get(4, 4)).toBe('Location 4');
    });

    it('expires stale entries after TTL', async () => {
      const shortCache = new NominatimLruCache(10, 50); // 50ms TTL
      shortCache.set(40.7128, -74.006, 'Temporary Address');
      expect(shortCache.get(40.7128, -74.006)).toBe('Temporary Address');

      await new Promise((r) => setTimeout(r, 60));
      expect(shortCache.get(40.7128, -74.006)).toBeNull();
    });
  });

  describe('2. Coordinate Formatting & External Navigation URLs', () => {
    it('formats coordinates with cardinal compass symbols', () => {
      // Northern & Western Hemispheres (e.g. New York)
      expect(formatCoordinates(40.7128, -74.006)).toBe('40.7128° N, 74.0060° W');

      // Southern & Eastern Hemispheres (e.g. Sydney)
      expect(formatCoordinates(-33.8688, 151.2093)).toBe('33.8688° S, 151.2093° E');

      // Equator & Prime Meridian
      expect(formatCoordinates(0, 0)).toBe('0.0000° N, 0.0000° E');
    });

    it('generates zero-cost routing URLs for Google Maps and OpenStreetMap', () => {
      const urls = getNavigationUrls(40.7128, -74.006);

      expect(urls.googleMaps).toBe(
        'https://www.google.com/maps/search/?api=1&query=40.7128,-74.006'
      );
      expect(urls.openStreetMap).toBe(
        'https://www.openstreetmap.org/?mlat=40.7128&mlon=-74.006#map=16/40.7128/-74.006'
      );
      expect(urls.appleMaps).toBe('https://maps.apple.com/?q=40.7128,-74.006');
    });
  });
});
