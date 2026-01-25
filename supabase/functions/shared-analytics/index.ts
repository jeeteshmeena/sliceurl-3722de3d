import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Handle new PBKDF2 format
  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    
    const salt = base64ToArrayBuffer(parts[1]);
    const expectedHash = parts[2];
    
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
    return arrayBufferToBase64(hash) === expectedHash;
  }
  
  // Legacy: simple SHA-256 with static salt (for backward compatibility)
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'sliceurl_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const legacyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return legacyHash === storedHash;
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
    const method = req.method;

    // GET: Fetch shared analytics data
    if (method === 'GET') {
      const token = url.searchParams.get('token');
      const password = url.searchParams.get('password');

      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch shared analytics record
      const { data: shared, error: sharedError } = await supabase
        .from('shared_analytics')
        .select('*, links!inner(id, short_code, title, original_url, created_at, click_count)')
        .eq('share_token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (sharedError || !shared) {
        console.log('Shared analytics not found:', token);
        return new Response(
          JSON.stringify({ error: 'Shared analytics not found or has been disabled' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check expiry
      if (shared.expires_at && new Date(shared.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'This shared link has expired' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check password if required
      if (shared.password_hash) {
        if (!password) {
          return new Response(
            JSON.stringify({ 
              error: 'Password required', 
              requires_password: true,
              link_title: shared.links?.title || shared.links?.short_code
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const isValid = await verifyPassword(password, shared.password_hash);
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: 'Invalid password', requires_password: true }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Increment views count
      await supabase
        .from('shared_analytics')
        .update({ views_count: shared.views_count + 1 })
        .eq('id', shared.id);

      // Fetch clicks for this link
      const { data: clicks, error: clicksError } = await supabase
        .from('clicks')
        .select('*')
        .eq('link_id', shared.link_id)
        .order('clicked_at', { ascending: false });

      if (clicksError) {
        console.error('Error fetching clicks:', clicksError);
      }

      // Process analytics
      const allClicks = clicks || [];
      const totalClicks = allClicks.length;
      const uniqueClicks = allClicks.filter(c => c.is_unique).length;

      // Device stats
      const deviceCounts: Record<string, number> = {};
      allClicks.forEach(c => {
        const device = c.device_type || 'unknown';
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      });

      // Country stats
      const countryCounts: Record<string, number> = {};
      allClicks.forEach(c => {
        const country = c.country || 'Unknown';
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      });

      // Referrer stats
      const referrerCounts: Record<string, number> = {};
      allClicks.forEach(c => {
        const referrer = c.referrer || 'Direct';
        referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1;
      });

      // Timeline (last 30 days)
      const timeline: Record<string, number> = {};
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        timeline[date.toISOString().split('T')[0]] = 0;
      }
      allClicks.forEach(c => {
        const date = c.clicked_at.split('T')[0];
        if (timeline[date] !== undefined) {
          timeline[date]++;
        }
      });

      const response = {
        link: {
          id: shared.links.id,
          short_code: shared.links.short_code,
          title: shared.links.title,
          original_url: shared.links.original_url,
          created_at: shared.links.created_at,
          click_count: shared.links.click_count
        },
        summary: {
          total_clicks: totalClicks,
          unique_clicks: uniqueClicks,
          devices: Object.entries(deviceCounts).map(([name, count]) => ({ name, count })),
          countries: Object.entries(countryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count })),
          referrers: Object.entries(referrerCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count })),
          timeline: Object.entries(timeline).map(([date, clicks]) => ({ date, clicks }))
        },
        shared_at: shared.created_at,
        views_count: shared.views_count + 1
      };

      console.log(`Shared analytics viewed: ${token} (${totalClicks} clicks)`);

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Create a new shared analytics link
    if (method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authorization' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { link_id, password, expires_in_days } = body;

      if (!link_id) {
        return new Response(
          JSON.stringify({ error: 'link_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user owns the link
      const { data: link, error: linkError } = await supabase
        .from('links')
        .select('id, user_id')
        .eq('id', link_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (linkError || !link) {
        return new Response(
          JSON.stringify({ error: 'Link not found or you do not own it' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate unique share token
      const shareToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

      // Hash password if provided
      let passwordHash = null;
      if (password && password.trim()) {
        passwordHash = await hashPassword(password);
      }

      // Calculate expiry date
      let expiresAt = null;
      if (expires_in_days && expires_in_days > 0) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + expires_in_days);
        expiresAt = expiry.toISOString();
      }

      // Create shared analytics record
      const { data: shared, error: createError } = await supabase
        .from('shared_analytics')
        .insert({
          link_id,
          user_id: user.id,
          share_token: shareToken,
          password_hash: passwordHash,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating shared analytics:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create shared link' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Shared analytics created: ${shareToken} for link ${link_id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          share_token: shareToken,
          share_url: `${url.origin.replace('/functions/v1/shared-analytics', '')}/shared/${shareToken}`,
          expires_at: expiresAt,
          has_password: !!passwordHash
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE: Revoke a shared analytics link
    if (method === 'DELETE') {
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

      const shareToken = url.searchParams.get('token');
      if (!shareToken) {
        return new Response(
          JSON.stringify({ error: 'Token is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase
        .from('shared_analytics')
        .delete()
        .eq('share_token', shareToken)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting shared analytics:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete shared link' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Shared analytics deleted: ${shareToken}`);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Shared analytics error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
