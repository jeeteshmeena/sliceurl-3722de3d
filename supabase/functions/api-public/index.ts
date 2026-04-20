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

function isValidUpiUrl(url: string): { valid: boolean; error?: string } {
  // Max 4KB
  if (url.length > 4096) {
    return { valid: false, error: 'UPI URL exceeds maximum length (4KB)' };
  }
  // Must start with upi://pay? (case-insensitive scheme)
  if (!/^upi:\/\/pay\?/i.test(url)) {
    return { valid: false, error: 'UPI URL must start with upi://pay?' };
  }
  // Parse query params from everything after "upi://pay?"
  const qIndex = url.indexOf('?');
  if (qIndex === -1) {
    return { valid: false, error: 'UPI URL missing query parameters' };
  }
  const params = new URLSearchParams(url.slice(qIndex + 1));
  const pa = params.get('pa');
  const am = params.get('am');
  if (!pa || pa.trim() === '') {
    return { valid: false, error: 'UPI URL must include pa= (payee VPA)' };
  }
  if (!am || am.trim() === '') {
    return { valid: false, error: 'UPI URL must include am= (amount)' };
  }
  // Validate amount is a positive number
  if (isNaN(Number(am)) || Number(am) <= 0) {
    return { valid: false, error: 'UPI amount (am) must be a positive number' };
  }
  return { valid: true };
}

function isValidShortenUrl(url: string): { valid: boolean; error?: string } {
  // Check UPI first
  if (/^upi:/i.test(url)) {
    return isValidUpiUrl(url);
  }
  // Standard HTTP(S)
  if (isValidHttpUrl(url)) {
    return { valid: true };
  }
  return { valid: false, error: 'Invalid URL. Only http://, https://, and upi://pay? URLs are accepted.' };
}

function safeTitleForUrl(url: string): string {
  if (/^upi:/i.test(url)) {
    return 'API: UPI Payment';
  }
  try {
    return `API: ${new URL(url).hostname}`;
  } catch {
    return 'API: Link';
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
  // Atomic increment via SQL function — race-condition-safe
  const { error } = await supabase.rpc('bump_api_key_usage', { _key_id: keyData.id });
  if (error) {
    console.error('Failed to bump usage counter:', error);
  }
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
      const title: string | undefined = body.title;
      const expiresAt: string | undefined = body.expires_at;
      const maxClicks: number | undefined = body.max_clicks;
      const password: string | undefined = body.password;

      if (!originalUrl) {
        return errorRes('long_url is required', 400);
      }

      const urlCheck = isValidShortenUrl(originalUrl);
      if (!urlCheck.valid) {
        return errorRes(urlCheck.error!, 400);
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

      // Optional password hashing (PBKDF2 — same format as shorten function)
      let passwordHash: string | null = null;
      if (password && typeof password === 'string' && password.length > 0) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
        const hash = await crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
          keyMaterial,
          256
        );
        const b64 = (buf: ArrayBuffer | Uint8Array) => {
          const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
          let bin = '';
          for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
          return btoa(bin);
        };
        passwordHash = `pbkdf2$${b64(salt)}$${b64(hash)}`;
      }

      const { data: link, error: linkError } = await supabase
        .from('links')
        .insert({
          original_url: originalUrl,
          short_code: shortCode,
          user_id: keyData.user_id,
          api_source: true,
          api_key_id: keyData.id,
          title: title || safeTitleForUrl(originalUrl),
          expires_at: expiresAt || null,
          max_clicks: maxClicks || null,
          is_password_protected: !!passwordHash,
          password_hash: passwordHash,
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
          title: link.title,
          expires_at: link.expires_at,
          max_clicks: link.max_clicks,
          password_protected: !!passwordHash,
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
      // Accept either: ["url", ...]  OR  [{ long_url, custom_alias }, ...]
      const rawItems: Array<string | { long_url?: string; url?: string; custom_alias?: string; custom_slug?: string }> = body.urls || body.items;

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return errorRes('urls (or items) must be a non-empty array', 400);
      }
      if (rawItems.length > 25) {
        return errorRes('Maximum 25 URLs per batch request', 400);
      }

      const siteUrl = Deno.env.get('SITE_URL') || 'https://sliceurl.app';
      const results: { success: boolean; short_url?: string; original_url: string; slug?: string; error?: string }[] = [];

      for (const item of rawItems) {
        const rawUrl = typeof item === 'string' ? item : (item.long_url || item.url || '');
        const alias = typeof item === 'string' ? undefined : (item.custom_alias || item.custom_slug);

        const batchCheck = isValidShortenUrl(rawUrl);
        if (!batchCheck.valid) {
          results.push({ success: false, original_url: rawUrl, error: batchCheck.error || 'Invalid URL' });
          continue;
        }

        let code: string;
        if (alias && alias.trim()) {
          const trimmed = alias.trim();
          if (!/^[a-zA-Z0-9_-]{2,64}$/.test(trimmed)) {
            results.push({ success: false, original_url: rawUrl, error: 'Invalid custom_alias format' });
            continue;
          }
          const { data: existing } = await supabase.from('links').select('id').eq('short_code', trimmed).maybeSingle();
          if (existing) {
            results.push({ success: false, original_url: rawUrl, error: 'Custom alias already exists' });
            continue;
          }
          code = trimmed;
        } else {
          code = nanoid(7);
        }

        const { error } = await supabase.from('links').insert({
          original_url: rawUrl,
          short_code: code,
          user_id: keyData.user_id,
          api_source: true,
          api_key_id: keyData.id,
          title: safeTitleForUrl(rawUrl),
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

      return jsonRes({ success: true, results, total: rawItems.length, succeeded: results.filter(r => r.success).length }, 201);
    }

    // ════════════════════════════════════════════════════
    // GET ?action=info&slug=…
    // Lightweight metadata about a single link
    // ════════════════════════════════════════════════════
    if (action === 'info' && req.method === 'GET') {
      const slug = url.searchParams.get('slug');
      if (!slug) return errorRes('slug query parameter is required', 400);

      const { data: link, error: linkError } = await supabase
        .from('links')
        .select('short_code, original_url, title, click_count, created_at, expires_at, max_clicks, is_password_protected, api_source')
        .eq('short_code', slug)
        .eq('user_id', keyData.user_id)
        .single();

      if (linkError || !link) return errorRes('Link not found or not owned by you', 404);

      await bumpRequestCount(supabase, keyData);

      const siteUrl = Deno.env.get('SITE_URL') || 'https://sliceurl.app';
      return jsonRes({
        success: true,
        slug: link.short_code,
        short_url: `${siteUrl}/s/${link.short_code}`,
        original_url: link.original_url,
        title: link.title,
        clicks: link.click_count || 0,
        expires_at: link.expires_at,
        max_clicks: link.max_clicks,
        password_protected: link.is_password_protected,
        api_generated: link.api_source || false,
        created_at: link.created_at,
      });
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
