import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";
import { nanoid } from "https://esm.sh/nanoid@5.0.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

// Hash function for API keys
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

async function validateApiKey(supabase: any, apiKey: string): Promise<{ valid: boolean; error?: string; status?: number; keyData?: ApiKeyData }> {
  if (!apiKey || !apiKey.startsWith('slc_')) {
    return { valid: false, error: 'Invalid API key format', status: 401 };
  }

  const keyHash = await hashApiKey(apiKey);

  const { data: keyData, error: keyError } = await supabase
    .from('api_keys')
    .select('id, user_id, status, rate_limit_daily, requests_today, rate_limit_reset_at')
    .eq('key_hash', keyHash)
    .single();

  if (keyError || !keyData) {
    return { valid: false, error: 'Invalid API key', status: 403 };
  }

  if (keyData.status === 'revoked') {
    return { valid: false, error: 'API key has been revoked', status: 403 };
  }

  // Check rate limit
  const now = new Date();
  const resetAt = new Date(keyData.rate_limit_reset_at);

  // Reset counter if past reset time
  if (now >= resetAt) {
    await supabase
      .from('api_keys')
      .update({
        requests_today: 0,
        rate_limit_reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', keyData.id);
    keyData.requests_today = 0;
  }

  if (keyData.requests_today >= keyData.rate_limit_daily) {
    return { 
      valid: false, 
      error: 'RATE_LIMIT_EXCEEDED', 
      status: 429 
    };
  }

  return { valid: true, keyData };
}

async function incrementRequestCount(supabase: any, keyId: string) {
  await supabase
    .from('api_keys')
    .update({
      requests_today: supabase.sql`requests_today + 1`,
      last_request_at: new Date().toISOString()
    })
    .eq('id', keyId);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Extract API key from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing API key. Use Authorization: Bearer <API_KEY>' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '');
    const validation = await validateApiKey(supabase, apiKey);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: validation.status || 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const keyData = validation.keyData!;

    // Parse the route: /api/v1/{action}/{param}
    // pathParts should be like ['api-public', 'v1', 'shorten'] or similar
    const version = url.searchParams.get('v') || 'v1';
    const action = url.searchParams.get('action');
    const slug = url.searchParams.get('slug');

    // ============ POST /api/v1/shorten ============
    if (action === 'shorten' && req.method === 'POST') {
      const body = await req.json();
      const { url: originalUrl, custom_slug } = body;

      if (!originalUrl) {
        return new Response(
          JSON.stringify({ error: 'url is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate URL
      try {
        new URL(originalUrl);
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid URL format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate or use custom slug
      const shortCode = custom_slug || nanoid(7);

      // Check if custom slug is available
      if (custom_slug) {
        const { data: existing } = await supabase
          .from('links')
          .select('id')
          .eq('short_code', custom_slug)
          .maybeSingle();

        if (existing) {
          return new Response(
            JSON.stringify({ error: 'Custom slug already taken' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Create the link
      const { data: link, error: linkError } = await supabase
        .from('links')
        .insert({
          original_url: originalUrl,
          short_code: shortCode,
          user_id: keyData.user_id,
          api_source: true,
          api_key_id: keyData.id,
          title: `API: ${new URL(originalUrl).hostname}`
        })
        .select()
        .single();

      if (linkError) {
        console.error('Error creating link:', linkError);
        return new Response(
          JSON.stringify({ error: 'Failed to create short link' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Increment request count
      await supabase
        .from('api_keys')
        .update({
          requests_today: keyData.requests_today + 1,
          last_request_at: new Date().toISOString()
        })
        .eq('id', keyData.id);

      console.log(`API shorten: ${shortCode} by user ${keyData.user_id}`);

      // Use sliceurl.app as the canonical domain
      const siteUrl = Deno.env.get('SITE_URL') || 'https://sliceurl.app';

      return new Response(
        JSON.stringify({
          short_url: `${siteUrl}/s/${shortCode}`,
          slug: shortCode,
          original_url: originalUrl,
          created_at: link.created_at,
          api_generated: true
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ GET /api/v1/analytics/:slug ============
    if (action === 'analytics' && req.method === 'GET') {
      if (!slug) {
        return new Response(
          JSON.stringify({ error: 'slug parameter is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get link by slug
      const { data: link, error: linkError } = await supabase
        .from('links')
        .select('id, short_code, original_url, click_count, created_at, user_id')
        .eq('short_code', slug)
        .eq('user_id', keyData.user_id)
        .single();

      if (linkError || !link) {
        return new Response(
          JSON.stringify({ error: 'Link not found or not owned by you' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get click analytics
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: clicks } = await supabase
        .from('clicks')
        .select('clicked_at, country, device_type, browser, os, referrer, is_unique')
        .eq('link_id', link.id)
        .gte('clicked_at', thirtyDaysAgo);

      // Process analytics
      const stats = {
        total_clicks: link.click_count || 0,
        unique_clicks: clicks?.filter(c => c.is_unique).length || 0,
        countries: {} as Record<string, number>,
        devices: {} as Record<string, number>,
        browsers: {} as Record<string, number>,
        os: {} as Record<string, number>,
        referrers: {} as Record<string, number>,
        last_30_days: [] as { date: string; clicks: number }[]
      };

      // Aggregate data
      clicks?.forEach(click => {
        if (click.country) stats.countries[click.country] = (stats.countries[click.country] || 0) + 1;
        if (click.device_type) stats.devices[click.device_type] = (stats.devices[click.device_type] || 0) + 1;
        if (click.browser) stats.browsers[click.browser] = (stats.browsers[click.browser] || 0) + 1;
        if (click.os) stats.os[click.os] = (stats.os[click.os] || 0) + 1;
        if (click.referrer) stats.referrers[click.referrer] = (stats.referrers[click.referrer] || 0) + 1;
      });

      // Build last 30 days timeline
      const dayMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        dayMap[date] = 0;
      }
      clicks?.forEach(click => {
        const date = click.clicked_at.split('T')[0];
        if (dayMap[date] !== undefined) dayMap[date]++;
      });
      stats.last_30_days = Object.entries(dayMap).map(([date, clicks]) => ({ date, clicks }));

      // Increment request count
      await supabase
        .from('api_keys')
        .update({
          requests_today: keyData.requests_today + 1,
          last_request_at: new Date().toISOString()
        })
        .eq('id', keyData.id);

      return new Response(
        JSON.stringify({
          slug: link.short_code,
          original_url: link.original_url,
          created_at: link.created_at,
          ...stats
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ DELETE /api/v1/link/:slug ============
    if (action === 'delete' && req.method === 'DELETE') {
      if (!slug) {
        return new Response(
          JSON.stringify({ error: 'slug parameter is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase
        .from('links')
        .delete()
        .eq('short_code', slug)
        .eq('user_id', keyData.user_id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: 'Failed to delete link' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Increment request count
      await supabase
        .from('api_keys')
        .update({
          requests_today: keyData.requests_today + 1,
          last_request_at: new Date().toISOString()
        })
        .eq('id', keyData.id);

      return new Response(
        JSON.stringify({ success: true, message: 'Link deleted' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ GET /api/v1/list ============
    if (action === 'list' && req.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const { data: links, error: linksError } = await supabase
        .from('links')
        .select('short_code, original_url, title, click_count, created_at, api_source')
        .eq('user_id', keyData.user_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (linksError) {
        return new Response(
          JSON.stringify({ error: 'Failed to list links' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Increment request count
      await supabase
        .from('api_keys')
        .update({
          requests_today: keyData.requests_today + 1,
          last_request_at: new Date().toISOString()
        })
        .eq('id', keyData.id);

      return new Response(
        JSON.stringify({
          links: links?.map(l => ({
            slug: l.short_code,
            original_url: l.original_url,
            title: l.title,
            clicks: l.click_count || 0,
            created_at: l.created_at,
            api_generated: l.api_source || false
          })),
          count: links?.length || 0,
          limit,
          offset
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint. Use action=shorten|analytics|delete|list' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Public API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
