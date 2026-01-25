import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateShortCode(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function isValidUrl(url: string): boolean {
  if (typeof url !== 'string' || !url.startsWith('http')) {
    return false;
  }
  try {
    new URL(url);
    return true;
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

function appendUtmParams(url: string, batchId: string): string {
  try {
    const urlObj = new URL(url);
    // Only add UTM params if they don't already exist
    if (!urlObj.searchParams.has('utm_source')) {
      urlObj.searchParams.set('utm_source', 'sliceurl');
    }
    if (!urlObj.searchParams.has('utm_medium')) {
      urlObj.searchParams.set('utm_medium', 'bulk');
    }
    if (!urlObj.searchParams.has('utm_campaign')) {
      urlObj.searchParams.set('utm_campaign', batchId);
    }
    return urlObj.toString();
  } catch {
    // Fallback: simple string append with proper separator
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}utm_source=sliceurl&utm_medium=bulk&utm_campaign=${batchId}`;
  }
}

async function generateTitle(url: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Extract a short, readable title (max 50 chars) from the given URL. Return ONLY the title, nothing else."
          },
          {
            role: "user",
            content: `URL: ${url}`
          }
        ],
        max_tokens: 60,
      }),
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    const title = data.choices?.[0]?.message?.content?.trim();
    return title && title.length > 0 ? title.slice(0, 100) : null;
  } catch (error) {
    console.error("Title generation error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { batchName, password, expiry, maxClicks, slugPrefix, autoTitle, urls } = body;

    // Validate and filter URLs
    const validUrls = (urls || []).filter((u: unknown) => isValidUrl(u as string)) as string[];

    if (validUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'NO_VALID_URLS', message: 'No valid URLs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (validUrls.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Maximum 100 URLs allowed per batch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Hash password if provided
    let passwordHash: string | null = null;
    if (password && password.length > 0) {
      passwordHash = await hashPassword(password);
    }

    // Get existing short codes to avoid duplicates
    const { data: existingLinks } = await supabase
      .from('links')
      .select('short_code, custom_slug');
    
    const existingCodes = new Set<string>();
    existingLinks?.forEach(l => {
      existingCodes.add(l.short_code);
      if (l.custom_slug) existingCodes.add(l.custom_slug);
    });

    const results: Array<{
      index: number;
      url: string;
      success: boolean;
      error?: string;
      link?: {
        id: string;
        short_code: string;
        custom_slug?: string;
        title?: string;
        original_url: string;
      };
    }> = [];

    for (let i = 0; i < validUrls.length; i++) {
      const originalUrl = validUrls[i];
      
      try {
        // Generate slug
        let slug: string;
        const prefix = slugPrefix?.trim() || '';
        const paddedIndex = String(i + 1).padStart(3, '0');
        
        if (prefix) {
          slug = `${prefix}${paddedIndex}`;
          // Ensure uniqueness
          let attempt = 0;
          while (existingCodes.has(slug) && attempt < 10) {
            attempt++;
            slug = `${prefix}${paddedIndex}-${attempt}`;
          }
        } else {
          // Generate random short code
          do {
            slug = generateShortCode();
          } while (existingCodes.has(slug));
        }
        
        existingCodes.add(slug);

        // Generate title if autoTitle enabled
        let title: string | null = null;
        if (autoTitle && lovableApiKey) {
          title = await generateTitle(originalUrl, lovableApiKey);
        }

        // Append UTM parameters to original URL
        const urlWithUtm = appendUtmParams(originalUrl, batchId);

        // Insert link
        const { data: link, error: insertError } = await supabase
          .from('links')
          .insert({
            original_url: originalUrl,
            final_utm_url: urlWithUtm,
            short_code: slug,
            custom_slug: prefix ? slug : null,
            title: title,
            user_id: user.id,
            batch_id: batchId,
            order_index: i,
            password_hash: passwordHash,
            is_password_protected: !!passwordHash,
            expires_at: expiry || null,
            max_clicks: maxClicks || null,
            utm_enabled: true,
            utm_source: 'sliceurl',
            utm_medium: 'bulk',
            utm_campaign: batchId,
            click_count: 0,
          })
          .select('id, short_code, custom_slug, title, original_url')
          .single();

        if (insertError) {
          console.error(`Insert error for URL ${i}:`, insertError);
          results.push({
            index: i,
            url: originalUrl,
            success: false,
            error: 'Database error',
          });
        } else {
          results.push({
            index: i,
            url: originalUrl,
            success: true,
            link: link,
          });
        }
      } catch (error) {
        console.error(`Processing error for URL ${i}:`, error);
        results.push({
          index: i,
          url: originalUrl,
          success: false,
          error: 'Processing error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Bulk shorten complete: ${successCount}/${validUrls.length} successful, batch: ${batchId}`);

    return new Response(
      JSON.stringify({
        batchId,
        batchName: batchName || null,
        totalUrls: validUrls.length,
        successCount,
        failCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Bulk shorten error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
