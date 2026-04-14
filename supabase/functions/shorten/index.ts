import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

function generateShortCode(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function isValidUrl(url: string): boolean {
  // Allow UPI payment deep links
  if (/^upi:\/\/pay\?/i.test(url)) {
    const qIndex = url.indexOf('?');
    if (qIndex === -1) return false;
    const params = new URLSearchParams(url.slice(qIndex + 1));
    const pa = params.get('pa');
    const am = params.get('am');
    return !!(pa && pa.trim() && am && am.trim() && !isNaN(Number(am)) && Number(am) > 0);
  }
  try {
    const parsed = new URL(url);
    const isStandardProtocol = ['http:', 'https:', 'tel:', 'mailto:', 'sms:'].includes(parsed.protocol);
    const isDeepLink = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url);
    return isStandardProtocol || isDeepLink;
  } catch {
    return false;
  }
}

// PBKDF2 password hashing with unique salts
const PBKDF2_ITERATIONS = 100000;

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  // Format: pbkdf2$salt$hash
  return `pbkdf2$${arrayBufferToBase64(salt)}$${arrayBufferToBase64(hash)}`;
}

function buildUtmUrl(baseUrl: string, params: {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
}): string {
  if (!baseUrl) return baseUrl;
  
  try {
    const url = new URL(baseUrl);
    const entries = Object.entries(params).filter(([_, value]) => value && value.trim() !== "");
    
    entries.forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value.trim());
    });
    
    return url.toString();
  } catch {
    const queryParams = Object.entries(params)
      .filter(([_, value]) => value && value.trim() !== "")
      .map(([key, value]) => `${key}=${encodeURIComponent(value!.trim())}`)
      .join("&");
    
    if (!queryParams) return baseUrl;
    
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}${queryParams}`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      original_url,
      custom_slug,
      title,
      password,
      expires_at,
      max_clicks,
      is_private,
      folder_id,
      facebook_pixel,
      google_pixel,
      custom_og_title,
      custom_og_description,
      custom_og_image,
      custom_favicon,
      user_id,
      utm_enabled,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      final_utm_url
    } = body;

    if (!original_url || !isValidUrl(original_url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let shortCode = custom_slug?.trim();
    
    if (shortCode) {
      if (!/^[a-zA-Z0-9_-]+$/.test(shortCode)) {
        return new Response(
          JSON.stringify({ error: 'Custom slug can only contain letters, numbers, hyphens, and underscores' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data: existing } = await supabase
        .from('links')
        .select('id')
        .eq('short_code', shortCode)
        .maybeSingle();
      
      if (existing) {
        return new Response(
          JSON.stringify({ error: 'This custom slug is already taken' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      let isUnique = false;
      while (!isUnique) {
        shortCode = generateShortCode();
        const { data: existing } = await supabase
          .from('links')
          .select('id')
          .eq('short_code', shortCode)
          .maybeSingle();
        isUnique = !existing;
      }
    }

    let passwordHash = null;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    const utmParams = { utm_source, utm_medium, utm_campaign, utm_term, utm_content };
    const computedFinalUrl = utm_enabled ? (final_utm_url || buildUtmUrl(original_url, utmParams)) : null;

    const { data: link, error: linkError } = await supabase
      .from('links')
      .insert({
        original_url,
        short_code: shortCode,
        custom_slug: custom_slug || null,
        title: title || null,
        password_hash: passwordHash,
        is_password_protected: !!password,
        expires_at: expires_at || null,
        max_clicks: max_clicks || null,
        is_private: is_private || false,
        folder_id: folder_id || null,
        facebook_pixel: facebook_pixel || null,
        google_pixel: google_pixel || null,
        custom_og_title: custom_og_title || null,
        custom_og_description: custom_og_description || null,
        custom_og_image: custom_og_image || null,
        custom_favicon: custom_favicon || null,
        user_id: user_id || null,
        click_count: 0,
        utm_enabled: utm_enabled || false,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_term: utm_term || null,
        utm_content: utm_content || null,
        final_utm_url: computedFinalUrl
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

    if (utm_enabled && user_id && link) {
      const { error: utmError } = await supabase
        .from('utm_data')
        .insert({
          link_id: link.id,
          user_id: user_id,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          utm_term: utm_term || null,
          utm_content: utm_content || null,
          final_url: computedFinalUrl
        });

      if (utmError) {
        console.error('Error creating UTM data:', utmError);
      }
    }

    const { password_hash: _, ...safeLink } = link;

    console.log(`Link created: ${shortCode} -> ${original_url}${utm_enabled ? ' (UTM enabled)' : ''}`);

    return new Response(
      JSON.stringify({ success: true, link: safeLink }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Shorten error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
