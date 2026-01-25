/**
 * API Endpoints Hook - Browser Extension Ready
 * 
 * This hook provides programmatic access to SliceURL functionality
 * for use in browser extensions or third-party integrations.
 * 
 * All endpoints are accessible via Supabase Edge Functions:
 * - /api/shorten - Create short links
 * - /api/bulk - Bulk URL shortening
 * - /api/analytics - Get link analytics
 * 
 * Authentication is handled via Supabase auth tokens.
 */

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ShortenRequest {
  url: string;
  customSlug?: string;
  password?: string;
  expiresAt?: string;
}

interface ShortenResponse {
  success: boolean;
  shortUrl?: string;
  shortCode?: string;
  error?: string;
}

interface BulkShortenRequest {
  urls: string[];
}

interface BulkShortenResponse {
  success: boolean;
  results?: Array<{ original: string; shortened: string; shortCode: string }>;
  error?: string;
}

interface AnalyticsResponse {
  success: boolean;
  data?: {
    clicks: number;
    uniqueClicks: number;
    topCountries: Array<{ country: string; count: number }>;
    topReferrers: Array<{ referrer: string; count: number }>;
    clicksByDay: Array<{ date: string; count: number }>;
  };
  error?: string;
}

export function useApiEndpoints() {
  const getAuthToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  /**
   * Shorten a single URL
   */
  const shorten = async (request: ShortenRequest): Promise<ShortenResponse> => {
    try {
      const token = await getAuthToken();
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/shorten`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          url: request.url,
          custom_slug: request.customSlug,
          password: request.password,
          expires_at: request.expiresAt,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || "Failed to shorten URL" };
      }

      return {
        success: true,
        shortUrl: `${window.location.origin}/s/${data.short_code}`,
        shortCode: data.short_code,
      };
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  };

  /**
   * Bulk shorten multiple URLs
   */
  const bulkShorten = async (request: BulkShortenRequest): Promise<BulkShortenResponse> => {
    try {
      const token = await getAuthToken();
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bulk-shorten`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ urls: request.urls }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || "Failed to bulk shorten" };
      }

      return {
        success: true,
        results: data.results,
      };
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  };

  /**
   * Get analytics for a link
   */
  const getAnalytics = async (linkId: string): Promise<AnalyticsResponse> => {
    try {
      const token = await getAuthToken();
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/stats?link_id=${linkId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || "Failed to fetch analytics" };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  };

  /**
   * Quick copy: shorten and immediately copy to clipboard
   * Perfect for browser extension "one-click" functionality
   */
  const quickShorten = async (url: string): Promise<{ success: boolean; shortUrl?: string; copied: boolean; error?: string }> => {
    const result = await shorten({ url });
    
    if (!result.success || !result.shortUrl) {
      return { success: false, copied: false, error: result.error };
    }

    try {
      await navigator.clipboard.writeText(result.shortUrl);
      return { success: true, shortUrl: result.shortUrl, copied: true };
    } catch {
      return { success: true, shortUrl: result.shortUrl, copied: false };
    }
  };

  return {
    shorten,
    bulkShorten,
    getAnalytics,
    quickShorten,
    getAuthToken,
  };
}
