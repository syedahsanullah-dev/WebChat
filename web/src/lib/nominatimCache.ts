/**
 * In-Memory LRU Cache for OpenStreetMap Nominatim Reverse Geocoding
 * Prevents redundant external HTTP calls and stays well within OSM usage policy ($0 cost).
 * Caches coordinates rounded to ~100m grid buckets (3 decimal places).
 */

interface CacheEntry {
  address: string;
  timestamp: number;
}

export class NominatimLruCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(maxEntries = 10000, ttlMs = 24 * 60 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  /**
   * Generates a ~100-meter bucket key from latitude and longitude
   */
  public generateKey(lat: number, lng: number): string {
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `${roundedLat},${roundedLng}`;
  }

  public get(lat: number, lng: number): string | null {
    const key = this.generateKey(lat, lng);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.address;
  }

  public set(lat: number, lng: number, address: string): void {
    const key = this.generateKey(lat, lng);

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // Evict oldest (first item in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      address,
      timestamp: Date.now(),
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const nominatimCache = new NominatimLruCache();
