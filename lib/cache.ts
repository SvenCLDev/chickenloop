/**
 * Cache control utilities for API responses
 * These headers help browsers and CDNs cache responses appropriately
 */

export interface CacheOptions {
  /**
   * Maximum age in seconds for the cache
   */
  maxAge?: number;
  /**
   * Whether the cache can be shared (public) or is user-specific (private)
   */
  scope?: 'public' | 'private';
  /**
   * Whether to revalidate stale cache entries
   */
  revalidate?: boolean;
  /**
   * Stale-while-revalidate time in seconds
   */
  swr?: number;
}

/**
 * Generate cache control headers for API responses
 */
export function getCacheHeaders(options: CacheOptions = {}): Record<string, string> {
  const {
    maxAge = 0,
    scope = 'private',
    revalidate = false,
    swr = 0,
  } = options;

  const directives: string[] = [];

  if (maxAge > 0) {
    directives.push(`${scope}`);
    directives.push(`max-age=${maxAge}`);
    
    if (swr > 0) {
      directives.push(`stale-while-revalidate=${swr}`);
    }
  } else {
    directives.push('no-store');
  }

  if (revalidate) {
    directives.push('must-revalidate');
  }

  return {
    'Cache-Control': directives.join(', '),
  };
}

/**
 * Preset cache configurations for common scenarios
 */
export const CachePresets = {
  // No caching - for user-specific or frequently changing data
  noCache: (): Record<string, string> => getCacheHeaders({ maxAge: 0 }),
  
  // Short cache - 5 minutes for semi-static data
  short: (): Record<string, string> => getCacheHeaders({ 
    maxAge: 300, 
    scope: 'public', 
    swr: 60 
  }),
  
  // Medium cache - 1 hour for relatively static data
  medium: (): Record<string, string> => getCacheHeaders({ 
    maxAge: 3600, 
    scope: 'public', 
    swr: 300 
  }),
  
  // Long cache - 24 hours for very static data
  long: (): Record<string, string> => getCacheHeaders({ 
    maxAge: 86400, 
    scope: 'public', 
    swr: 3600 
  }),
  
  // Private short cache - 1 minute for user-specific data
  privateShort: (): Record<string, string> => getCacheHeaders({ 
    maxAge: 60, 
    scope: 'private' 
  }),
};
