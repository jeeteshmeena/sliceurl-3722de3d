import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UAResult {
  device_type: string;
  browser: string;
  os: string;
}

function parseUserAgent(ua: string): UAResult {
  const result: UAResult = {
    device_type: 'desktop',
    browser: 'unknown',
    os: 'unknown'
  };

  if (/Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    result.device_type = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
  }

  if (ua.includes('Firefox')) result.browser = 'Firefox';
  else if (ua.includes('Edg')) result.browser = 'Edge';
  else if (ua.includes('Chrome')) result.browser = 'Chrome';
  else if (ua.includes('Safari')) result.browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR')) result.browser = 'Opera';
  else if (ua.includes('MSIE') || ua.includes('Trident')) result.browser = 'IE';

  if (ua.includes('Windows')) result.os = 'Windows';
  else if (ua.includes('Mac OS')) result.os = 'macOS';
  else if (ua.includes('Linux')) result.os = 'Linux';
  else if (ua.includes('Android')) result.os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) result.os = 'iOS';

  return result;
}

async function getGeoLocation(ip: string): Promise<{ country: string; city: string }> {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,city`);
    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country || 'Unknown',
        city: data.city || 'Unknown'
      };
    }
  } catch (e) {
    console.error('Geo lookup failed:', e);
  }
  return { country: 'Unknown', city: 'Unknown' };
}

async function getRedirectUrl(supabase: any, link: any): Promise<string> {
  if (link.utm_enabled) {
    const { data: utmData } = await supabase
      .from('utm_data')
      .select('final_url')
      .eq('link_id', link.id)
      .maybeSingle();
    
    if (utmData?.final_url) {
      return utmData.final_url;
    }
    
    if (link.final_utm_url) {
      return link.final_utm_url;
    }
  }
  
  return link.original_url;
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
    const shortCode = url.searchParams.get('code');
    const isPreview = url.searchParams.get('preview') === 'true';
    const referrer = req.headers.get('referer') || url.searchParams.get('ref');

    if (!shortCode) {
      return new Response(
        JSON.stringify({ error: 'Short code required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: link, error } = await supabase
      .from('links')
      .select('*, link_preview_enabled')
      .eq('short_code', shortCode)
      .maybeSingle();

    if (error || !link) {
      return new Response(
        JSON.stringify({ error: 'Link not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          error: 'This link has expired', 
          code: 'EXPIRED',
          expires_at: link.expires_at 
        }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (link.max_clicks && link.click_count >= link.max_clicks) {
      return new Response(
        JSON.stringify({ error: 'This link has reached its click limit', code: 'MAX_CLICKS' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Check per-link preview flag FIRST
    // If link_preview_enabled is false (default), always redirect instantly
    const redirectUrl = await getRedirectUrl(supabase, link);
    
    if (!link.link_preview_enabled && !isPreview) {
      // Preview is disabled for this link → instant redirect
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                 req.headers.get('cf-connecting-ip') || 
                 'unknown';
      const userAgent = req.headers.get('user-agent') || '';
      const { device_type, browser, os } = parseUserAgent(userAgent);

      let geo = { country: 'Unknown', city: 'Unknown' };
      if (ip !== 'unknown' && ip !== '127.0.0.1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
        geo = await getGeoLocation(ip);
      }

      const { data: existingClick } = await supabase
        .from('clicks')
        .select('id')
        .eq('link_id', link.id)
        .eq('ip_address', ip)
        .maybeSingle();

      await supabase.from('clicks').insert({
        link_id: link.id,
        ip_address: ip,
        user_agent: userAgent,
        referrer: referrer || null,
        country: geo.country,
        city: geo.city,
        device_type,
        browser,
        os,
        is_unique: !existingClick
      });

      await supabase
        .from('links')
        .update({
          click_count: (link.click_count || 0) + 1,
          last_clicked_at: new Date().toISOString()
        })
        .eq('id', link.id);

      console.log(`Instant redirect (preview disabled): ${shortCode} -> ${redirectUrl}`);

      // For UPI deep links, return JSON with redirect_url so frontend handles the scheme
      if (/^upi:/i.test(redirectUrl)) {
        return new Response(
          JSON.stringify({ redirect_url: redirectUrl, is_upi: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl,
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
        },
      });
    }

    // If password protected, show password prompt (even if preview enabled)
    if (link.is_password_protected) {
      return new Response(
        JSON.stringify({
          requires_password: true,
          link_id: link.id,
          title: link.title,
          custom_og_title: link.custom_og_title,
          custom_og_description: link.custom_og_description,
          custom_og_image: link.custom_og_image,
          custom_favicon: link.custom_favicon
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Legacy security mode check (only relevant if preview is enabled)
    let securityMode = 'warn';
    if (link.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('security_mode')
        .eq('user_id', link.user_id)
        .maybeSingle();
      
      securityMode = profile?.security_mode || 'warn';
    }

    if (securityMode === 'disable' && !isPreview) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                 req.headers.get('cf-connecting-ip') || 
                 'unknown';
      const userAgent = req.headers.get('user-agent') || '';
      const { device_type, browser, os } = parseUserAgent(userAgent);

      let geo = { country: 'Unknown', city: 'Unknown' };
      if (ip !== 'unknown' && ip !== '127.0.0.1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
        geo = await getGeoLocation(ip);
      }

      const { data: existingClick } = await supabase
        .from('clicks')
        .select('id')
        .eq('link_id', link.id)
        .eq('ip_address', ip)
        .maybeSingle();

      await supabase.from('clicks').insert({
        link_id: link.id,
        ip_address: ip,
        user_agent: userAgent,
        referrer: referrer || null,
        country: geo.country,
        city: geo.city,
        device_type,
        browser,
        os,
        is_unique: !existingClick
      });

      await supabase
        .from('links')
        .update({
          click_count: (link.click_count || 0) + 1,
          last_clicked_at: new Date().toISOString()
        })
        .eq('id', link.id);

      console.log(`Instant redirect: ${shortCode} -> ${redirectUrl}`);

      // For UPI deep links, return JSON so frontend handles the scheme
      if (/^upi:/i.test(redirectUrl)) {
        return new Response(
          JSON.stringify({ redirect_url: redirectUrl, is_upi: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl,
        },
      });
    }

    if (isPreview) {
      return new Response(
        JSON.stringify({
          link_id: link.id,
          redirect_url: redirectUrl,
          title: link.title,
          custom_og_title: link.custom_og_title,
          custom_og_description: link.custom_og_description,
          facebook_pixel: link.facebook_pixel,
          google_pixel: link.google_pixel,
          requires_password: false,
          link_preview_enabled: link.link_preview_enabled || false,
          auto_redirect: securityMode === 'disable',
          security_mode: securityMode,
          utm_enabled: link.utm_enabled
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('cf-connecting-ip') || 
               'unknown';
    const userAgent = req.headers.get('user-agent') || '';
    const { device_type, browser, os } = parseUserAgent(userAgent);

    let geo = { country: 'Unknown', city: 'Unknown' };
    if (ip !== 'unknown' && ip !== '127.0.0.1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
      geo = await getGeoLocation(ip);
    }

    const { data: existingClick } = await supabase
      .from('clicks')
      .select('id')
      .eq('link_id', link.id)
      .eq('ip_address', ip)
      .maybeSingle();

    await supabase.from('clicks').insert({
      link_id: link.id,
      ip_address: ip,
      user_agent: userAgent,
      referrer: referrer || null,
      country: geo.country,
      city: geo.city,
      device_type,
      browser,
      os,
      is_unique: !existingClick
    });

    await supabase
      .from('links')
      .update({
        click_count: (link.click_count || 0) + 1,
        last_clicked_at: new Date().toISOString()
      })
      .eq('id', link.id);

    console.log(`Redirect: ${shortCode} -> ${redirectUrl} (${device_type}/${browser} from ${geo.country})${link.utm_enabled ? ' [UTM]' : ''}`);

    return new Response(
      JSON.stringify({
        redirect_url: redirectUrl,
        facebook_pixel: link.facebook_pixel,
        google_pixel: link.google_pixel,
        custom_og_title: link.custom_og_title,
        custom_og_description: link.custom_og_description,
        custom_og_image: link.custom_og_image,
        custom_favicon: link.custom_favicon
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Redirect error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
