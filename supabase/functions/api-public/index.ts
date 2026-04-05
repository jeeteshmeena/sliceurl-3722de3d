import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";
import { nanoid } from "https://esm.sh/nanoid@5.0.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

// ─── Helpers ───────────────────────────────────────────

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return new TextDecoder().decode(hexEncode(hashArray));
}

interface ApiKeyData {
  id: string;
  user_id: string;
  status: string;
  rate_limit_daily: number;
  requests_today: number;
  rate_limit_reset_at: string;
}

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorRes(error: string, status: number) {
  return jsonRes({ success: false, error }, status);
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ─── Auth ──────────────────────────────────────────────

function extractApiKey(req: Request): string | null {
  // Support X-API-Key header
  const xApiKey = req.headers.get('x-api-key');
  if (xApiKey) return xApiKey;

  // Support Authorization: Bearer <key>
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  return null;
}

async function validateApiKey(
  supabase: ReturnType<typeof createClient>,
  apiKey: string
): Promise<{ valid: boolean; error?: string; status?: number; keyData?: ApiKeyData }> {
  if (!apiKey || !apiKey.startsWith('slc_')) {
    return { valid: false, error: 'Invalid API key format. Keys start with slc_', status: 401 };
  }

  const keyHash = await hashApiKey(apiKey);

  const { data: keyData, error: keyError } = await supabase
    .from('api_keys')
    .select('id, user_id, status, rate_limit_daily, requests_today, rate_limit_reset_at')
    .eq('key_hash', keyHash)
    .single();

  if (keyError || !keyData) {
    return { valid: false, error: 'Invalid API key', status: 401 };
  }

  if (keyData.status === 'revoked') {
    return { valid: false, error: 'API key has been revoked', status: 403 };
  }

  // Reset counter if past reset time
  const now = new Date();
  const resetAt = new Date(keyData.rate_limit_reset_at);
  if (now >= resetAt) {
    await supabase
      .from('api_keys')
      .update({
        requests_today: 0,
        rate_limit_reset_at: new Date(now.getTime() + 86400000).toISOString(),
      })
      .eq('id', keyData.id);
    keyData.requests_today = 0;
  }

  if (keyData.requests_today >= keyData.rate_limit_daily) {
    return {
      valid: false,
      error: 'Rate limit exceeded. Try again after your daily quota resets.',
      status: 429,
    };
  }

  return { valid: true, keyData: keyData as ApiKeyData };
}

async function bumpRequestCount(supabase: ReturnType<typeof createClient>, keyData: ApiKeyData) {
  await supabase
    .from('api_keys')
    .update({
      requests_today: keyData.requests_today + 1,
      last_request_at: new Date().toISOString(),
    })
    .eq('id', keyData.id);
}

// ─── Handler ───────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Authenticate ──
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      return errorRes(
        'Missing API key. Send it via "Authorization: Bearer <key>" or "X-API-Key: <key>" header.',
        401
      );
    }

    const validation = await validateApiKey(supabase, apiKey);
    if (!validation.valid) {
      return errorRes(validation.error!, validation.status!);
    }
    const keyData = validation.keyData!;

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // ════════════════════════════════════════════════════
    // POST ?action=shorten
    // ════════════════════════════════════════════════════
    if (action === 'shorten' && req.method === 'POST') {
      const body = await req.json();
      // Accept both field-name conventions
      const originalUrl: string | undefined = body.long_url || body.url;
      const customAlias: string | undefined = body.custom_alias || body.custom_slug;

      if (!originalUrl) {
        return errorRes('long_url is required', 400);
      }

      if (!isValidHttpUrl(originalUrl)) {
        return errorRes('Invalid URL. Only http:// and https:// URLs are accepted.', 400);
      }

      // Generate or validate slug
      let shortCode = customAlias?.trim();
      if (shortCode) {
        if (!/^[a-zA-Z0-9_-]{2,64}$/.test(shortCode)) {
          return errorRes(
            'custom_alias must be 2-64 characters containing only letters, numbers, hyphens, underscores.',
            400
          );
        }
        const { data: existing } = await supabase
          .from('links')
          .select('id')
          .eq('short_code', shortCode)
          .maybeSingle();
        if (existing) {
          return errorRes('Custom alias already exists.', 409);
        }
      } else {
        shortCode = nanoid(7);
      }

      const { data: link, error: linkError } = await supabase
        .from('links')
        .insert({
          original_url: originalUrl,
          short_code: shortCode,
          user_id: keyData.user_id,
          api_source: true,
          api_key_id: keyData.id,
          title: `API: ${new URL(originalUrl).hostname}`,
        })
        .select()
        .single();

      if (linkError) {
        console.error('Error creating link:', linkError);
        return errorRes('Failed to create short link', 500);
      }

      await bumpRequestCount(supabase, keyData);

      const siteUrl = Deno.env.get('SITE_URL') || 'https://sliceurl.app';

      return jsonRes(
        {
          success: true,
          short_url: `${siteUrl}/s/${shortCode}`,
          original_url: originalUrl,
          slug: shortCode,
          created_at: link.created_at,
        },
        201
      );
    }

    // ════════════════════════════════════════════════════
    // POST ?action=batch
    // ════════════════════════════════════════════════════
    if (action === 'batch' && req.method === 'POST') {
      const body = await req.json();
      const urls: string[] = body.urls;

      if (!Array.isArray(urls) || urls.length === 0) {
        return errorRes('urls must be a non-empty array of strings', 400);
      }
      if (urls.length > 25) {
        return errorRes('Maximum 25 URLs per batch request', 400);
      }

      const siteUrl = Deno.env.get('SITE_URL') || 'https://sliceurl.app';
      const results: { success: boolean; short_url?: string; original_url: string; slug?: string; error?: string }[] = [];

      for (const rawUrl of urls) {
        if (!isValidHttpUrl(rawUrl)) {
          results.push({ success: false, original_url: rawUrl, error: 'Invalid URL' });
          continue;
        }
        const code = nanoid(7);
        const { error } = await supabase.from('links').insert({
          original_url: rawUrl,
          short_code: code,
          user_id: keyData.user_id,
          api_source: true,
          api_key_id: keyData.id,
          title: `API: ${new URL(rawUrl).hostname}`,
        });
        if (error) {
          results.push({ success: false, original_url: rawUrl, error: 'Insert failed' });
        } else {
          results.push({
            success: true,
            short_url: `${siteUrl}/s/${code}`,
            original_url: rawUrl,
            slug: code,
          });
        }
      }

      await bumpRequestCount(supabase, keyData);

      return jsonRes({ success: true, results, total: urls.length, succeeded: results.filter(r => r.success).length }, 201);
    }

    // ════════════════════════════════════════════════════
    // GET ?action=analytics&slug=…
    // ════════════════════════════════════════════════════
    if (action === 'analytics' && req.method === 'GET') {
      const slug = url.searchParams.get('slug');
      if (!slug) return errorRes('slug query parameter is required', 400);

      const { data: link, error: linkError } = await supabase
        .from('links')
        .select('id, short_code, original_url, click_count, created_at, user_id')
        .eq('short_code', slug)
        .eq('user_id', keyData.user_id)
        .single();

      if (linkError || !link) return errorRes('Link not found or not owned by you', 404);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: clicks } = await supabase
        .from('clicks')
        .select('clicked_at, country, device_type, browser, os, referrer, is_unique')
        .eq('link_id', link.id)
        .gte('clicked_at', thirtyDaysAgo);

      const stats: Record<string, unknown> = {
        total_clicks: link.click_count || 0,
        unique_clicks: clicks?.filter(c => c.is_unique).length || 0,
        countries: {} as Record<string, number>,
        devices: {} as Record<string, number>,
        browsers: {} as Record<string, number>,
        os: {} as Record<string, number>,
        referrers: {} as Record<string, number>,
      };

      const countries = stats.countries as Record<string, number>;
      const devices = stats.devices as Record<string, number>;
      const browsers = stats.browsers as Record<string, number>;
      const osMap = stats.os as Record<string, number>;
      const referrers = stats.referrers as Record<string, number>;

      clicks?.forEach(c => {
        if (c.country) countries[c.country] = (countries[c.country] || 0) + 1;
        if (c.device_type) devices[c.device_type] = (devices[c.device_type] || 0) + 1;
        if (c.browser) browsers[c.browser] = (browsers[c.browser] || 0) + 1;
        if (c.os) osMap[c.os] = (osMap[c.os] || 0) + 1;
        if (c.referrer) referrers[c.referrer] = (referrers[c.referrer] || 0) + 1;
      });

      const dayMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        dayMap[new Date(Date.now() - i * 86400000).toISOString().split('T')[0]] = 0;
      }
      clicks?.forEach(c => {
        const d = c.clicked_at.split('T')[0];
        if (dayMap[d] !== undefined) dayMap[d]++;
      });

      await bumpRequestCount(supabase, keyData);

      return jsonRes({
        success: true,
        slug: link.short_code,
        original_url: link.original_url,
        created_at: link.created_at,
        ...stats,
        last_30_days: Object.entries(dayMap).map(([date, clicks]) => ({ date, clicks })),
      });
    }

    // ════════════════════════════════════════════════════
    // DELETE ?action=delete&slug=…
    // ════════════════════════════════════════════════════
    if (action === 'delete' && req.method === 'DELETE') {
      const slug = url.searchParams.get('slug');
      if (!slug) return errorRes('slug query parameter is required', 400);

      const { error: deleteError } = await supabase
        .from('links')
        .delete()
        .eq('short_code', slug)
        .eq('user_id', keyData.user_id);

      if (deleteError) return errorRes('Failed to delete link', 500);

      await bumpRequestCount(supabase, keyData);
      return jsonRes({ success: true, message: 'Link deleted' });
    }

    // ════════════════════════════════════════════════════
    // GET ?action=list
    // ════════════════════════════════════════════════════
    if (action === 'list' && req.method === 'GET') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const { data: links, error: linksError } = await supabase
        .from('links')
        .select('short_code, original_url, title, click_count, created_at, api_source')
        .eq('user_id', keyData.user_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (linksError) return errorRes('Failed to list links', 500);

      await bumpRequestCount(supabase, keyData);

      const siteUrl = Deno.env.get('SITE_URL') || 'https://sliceurl.app';
      return jsonRes({
        success: true,
        links: links?.map(l => ({
          short_url: `${siteUrl}/s/${l.short_code}`,
          slug: l.short_code,
          original_url: l.original_url,
          title: l.title,
          clicks: l.click_count || 0,
          created_at: l.created_at,
          api_generated: l.api_source || false,
        })),
        count: links?.length || 0,
        limit,
        offset,
      });
    }

    return errorRes(
      'Unknown action. Use action=shorten|batch|analytics|delete|list',
      404
    );
  } catch (error) {
    console.error('Public API error:', error);
    return errorRes('Internal server error', 500);
  }
});
