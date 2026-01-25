/**
 * Domain awareness utility for SliceURL
 * Auto-detects custom domain and uses it for link generation
 */

const CUSTOM_DOMAINS = ['sliceurl.app', 'www.sliceurl.app'];
const DEFAULT_DOMAIN = 'sliceurl.app';

/**
 * Get the base URL for the application
 * Detects if running on custom domain and uses that
 */
export function getBaseUrl(): string {
  // Check if we're in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If on custom domain, use that
    if (CUSTOM_DOMAINS.includes(hostname)) {
      return `https://${DEFAULT_DOMAIN}`;
    }
    
    // Check for localhost development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return window.location.origin;
    }
    
    // Use current origin (for lovable.app preview, etc.)
    return window.location.origin;
  }
  
  // Server-side or SSR fallback
  return `https://${DEFAULT_DOMAIN}`;
}

/**
 * Generate a short URL with the correct domain
 */
export function getShortUrl(shortCode: string): string {
  const base = getBaseUrl();
  return `${base}/s/${shortCode}`;
}

/**
 * Check if we're running on the production custom domain
 */
export function isProductionDomain(): boolean {
  if (typeof window !== 'undefined') {
    return CUSTOM_DOMAINS.includes(window.location.hostname);
  }
  return false;
}

/**
 * Get the display domain for UI purposes
 */
export function getDisplayDomain(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (CUSTOM_DOMAINS.includes(hostname)) {
      return DEFAULT_DOMAIN;
    }
    return hostname;
  }
  return DEFAULT_DOMAIN;
}
