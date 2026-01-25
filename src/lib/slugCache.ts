/**
 * Slug Availability Cache
 * 
 * Client-side cache for slug availability to reduce server round-trips
 * and make link shortening feel instant.
 */

interface CacheEntry {
  available: boolean;
  timestamp: number;
}

const CACHE_TTL = 60 * 1000; // 1 minute
const MAX_CACHE_SIZE = 1000;

class SlugCache {
  private cache: Map<string, CacheEntry> = new Map();
  private usedSlugs: Set<string> = new Set();
  
  /**
   * Check if a slug is known to be unavailable
   */
  isKnownUnavailable(slug: string): boolean {
    const entry = this.cache.get(slug);
    if (!entry) return false;
    
    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(slug);
      return false;
    }
    
    return !entry.available;
  }
  
  /**
   * Mark a slug as used (unavailable)
   */
  markUsed(slug: string): void {
    this.usedSlugs.add(slug);
    this.cache.set(slug, { available: false, timestamp: Date.now() });
    this.pruneCache();
  }
  
  /**
   * Mark a slug as available
   */
  markAvailable(slug: string): void {
    this.cache.set(slug, { available: true, timestamp: Date.now() });
    this.pruneCache();
  }
  
  /**
   * Check if slug was recently used in this session
   */
  wasRecentlyUsed(slug: string): boolean {
    return this.usedSlugs.has(slug);
  }
  
  /**
   * Prune old entries if cache is too large
   */
  private pruneCache(): void {
    if (this.cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20%
      const toRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }
  
  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    this.usedSlugs.clear();
  }
}

// Singleton instance
export const slugCache = new SlugCache();

/**
 * Pre-generate slugs that are likely unique
 * Uses high-entropy generation to minimize collision chance
 */
export function generateUniqueSlug(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += chars[array[i] % chars.length];
  }
  
  // If this slug was recently used, regenerate
  if (slugCache.wasRecentlyUsed(slug)) {
    return generateUniqueSlug(length);
  }
  
  return slug;
}

/**
 * Generate multiple unique slugs at once (for batch operations)
 */
export function generateBatchSlugs(count: number, length: number = 6): string[] {
  const slugs: string[] = [];
  const used = new Set<string>();
  
  while (slugs.length < count) {
    const slug = generateUniqueSlug(length);
    if (!used.has(slug) && !slugCache.wasRecentlyUsed(slug)) {
      slugs.push(slug);
      used.add(slug);
    }
  }
  
  return slugs;
}
