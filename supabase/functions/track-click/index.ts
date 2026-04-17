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
    browser: 'Unknown',
    os: 'Unknown',
  };

  // Device type detection
  if (/Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    result.device_type = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
  }

  // Browser detection - comprehensive including in-app browsers
  if (ua.includes('WhatsApp')) result.browser = 'WhatsApp';
  else if (ua.includes('Telegram')) result.browser = 'Telegram';
  else if (ua.includes('Instagram')) result.browser = 'Instagram';
  else if (ua.includes('FBAN') || ua.includes('FBAV')) result.browser = 'Facebook';
  else if (ua.includes('Twitter') || ua.includes('X-Twitter')) result.browser = 'X/Twitter';
  else if (ua.includes('LinkedIn')) result.browser = 'LinkedIn';
  else if (ua.includes('Firefox')) result.browser = 'Firefox';
  else if (ua.includes('Edg')) result.browser = 'Edge';
  else if (ua.includes('Chrome')) result.browser = 'Chrome';
  else if (ua.includes('Safari')) result.browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR')) result.browser = 'Opera';
  else if (ua.includes('MSIE') || ua.includes('Trident')) result.browser = 'IE';

  // OS detection
  if (ua.includes('Windows')) result.os = 'Windows';
  else if (ua.includes('Mac OS')) result.os = 'macOS';
  else if (ua.includes('Linux')) result.os = 'Linux';
  else if (ua.includes('Android')) result.os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) result.os = 'iOS';

  return result;
}

function parseReferrerSource(referrer: string | null, userAgent: string): string {
  if (!referrer) {
    // Check user agent for in-app browsers
    if (userAgent.includes('WhatsApp')) return 'WhatsApp';
    if (userAgent.includes('Telegram')) return 'Telegram';
    if (userAgent.includes('Instagram')) return 'Instagram';
    if (userAgent.includes('FBAN') || userAgent.includes('FBAV')) return 'Facebook';
    if (userAgent.includes('Twitter') || userAgent.includes('X-Twitter')) return 'X/Twitter';
    if (userAgent.includes('LinkedIn')) return 'LinkedIn';
    return 'Direct';
  }

  const refLower = referrer.toLowerCase();
  
  // Social media sources
  if (refLower.includes('whatsapp') || refLower.includes('wa.me')) return 'WhatsApp';
  if (refLower.includes('telegram') || refLower.includes('t.me')) return 'Telegram';
  if (refLower.includes('instagram')) return 'Instagram';
  if (refLower.includes('facebook') || refLower.includes('fb.com') || refLower.includes('fb.me')) return 'Facebook';
  if (refLower.includes('twitter') || refLower.includes('t.co') || refLower.includes('x.com')) return 'X/Twitter';
  if (refLower.includes('linkedin')) return 'LinkedIn';
  if (refLower.includes('youtube')) return 'YouTube';
  if (refLower.includes('tiktok')) return 'TikTok';
  if (refLower.includes('reddit')) return 'Reddit';
  if (refLower.includes('pinterest')) return 'Pinterest';
  if (refLower.includes('snapchat')) return 'Snapchat';
  
  // Search engines
  if (refLower.includes('google')) return 'Google';
  if (refLower.includes('bing')) return 'Bing';
  if (refLower.includes('yahoo')) return 'Yahoo';
  if (refLower.includes('duckduckgo')) return 'DuckDuckGo';
  
  // Email clients
  if (refLower.includes('mail') || refLower.includes('outlook') || refLower.includes('gmail')) return 'Email';
  
  // Try to extract domain
  try {
    const url = new URL(referrer);
    return url.hostname.replace('www.', '');
  } catch {
    return 'Website';
  }
}

interface GeoResult {
  country: string;
  city: string;
  region: string;
}

// Enhanced geolocation with Cloudflare headers priority
async function getGeoLocation(req: Request, ip: string): Promise<GeoResult> {
  const result: GeoResult = { country: 'Unknown', city: 'Unknown', region: 'Unknown' };

  // Priority 1: Cloudflare headers (most accurate, free, no API calls needed)
  const cfCountry = req.headers.get('cf-ipcountry');
  const cfCity = req.headers.get('cf-ipcity');
  const cfRegion = req.headers.get('cf-region');

  if (cfCountry && cfCountry !== 'XX') {
    // Map country codes to full names
    result.country = getCountryName(cfCountry);
    result.city = cfCity || 'Unknown';
    result.region = cfRegion || 'Unknown';
    console.log(`Geo from Cloudflare: ${result.country}, ${result.city}`);
    return result;
  }

  // Priority 2: Vercel headers
  const vercelCountry = req.headers.get('x-vercel-ip-country');
  const vercelCity = req.headers.get('x-vercel-ip-city');
  
  if (vercelCountry) {
    result.country = getCountryName(vercelCountry);
    result.city = vercelCity || 'Unknown';
    console.log(`Geo from Vercel: ${result.country}, ${result.city}`);
    return result;
  }

  // Priority 3: Fallback to ip-api.com (free tier)
  if (ip !== 'unknown' && ip !== '127.0.0.1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
    try {
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,regionName`, {
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      if (response.ok) {
        const data = await response.json();
        result.country = data.country || 'Unknown';
        result.city = data.city || 'Unknown';
        result.region = data.regionName || 'Unknown';
        console.log(`Geo from ip-api: ${result.country}, ${result.city}`);
      }
    } catch (e) {
      console.error('Geo lookup failed:', e);
    }
  }

  return result;
}

// Country code to name mapping (common codes)
function getCountryName(code: string): string {
  const countries: Record<string, string> = {
    'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada', 'AU': 'Australia',
    'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
    'BR': 'Brazil', 'MX': 'Mexico', 'AR': 'Argentina', 'CO': 'Colombia', 'CL': 'Chile',
    'IN': 'India', 'CN': 'China', 'JP': 'Japan', 'KR': 'South Korea', 'SG': 'Singapore',
    'RU': 'Russia', 'PL': 'Poland', 'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark',
    'FI': 'Finland', 'CH': 'Switzerland', 'AT': 'Austria', 'BE': 'Belgium', 'PT': 'Portugal',
    'IE': 'Ireland', 'NZ': 'New Zealand', 'ZA': 'South Africa', 'AE': 'United Arab Emirates',
    'SA': 'Saudi Arabia', 'IL': 'Israel', 'TR': 'Turkey', 'EG': 'Egypt', 'NG': 'Nigeria',
    'KE': 'Kenya', 'PH': 'Philippines', 'ID': 'Indonesia', 'MY': 'Malaysia', 'TH': 'Thailand',
    'VN': 'Vietnam', 'PK': 'Pakistan', 'BD': 'Bangladesh', 'UA': 'Ukraine', 'RO': 'Romania',
    'CZ': 'Czech Republic', 'HU': 'Hungary', 'GR': 'Greece', 'HK': 'Hong Kong', 'TW': 'Taiwan',
  };
  return countries[code.toUpperCase()] || code;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { link_id, referrer } = await req.json();
    
    if (!link_id) {
      return new Response(
        JSON.stringify({ error: 'Link ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if link exists and is not expired
    const { data: link, error: linkError } = await supabase
      .from('links')
      .select('id, expires_at, click_count, api_key_id')
      .eq('id', link_id)
      .maybeSingle();

    if (linkError || !link) {
      console.log(`Click tracking skipped: Link ${link_id} not found`);
      return new Response(
        JSON.stringify({ error: 'Link not found', skipped: true }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration - do NOT log clicks for expired links
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      console.log(`Click tracking skipped: Link ${link_id} has expired`);
      return new Response(
        JSON.stringify({ error: 'Link has expired', skipped: true }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info - prioritize Cloudflare IP
    const ip = req.headers.get('cf-connecting-ip') ||
               req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = req.headers.get('user-agent') || '';
    const { device_type, browser, os } = parseUserAgent(userAgent);
    
    // Parse referrer source
    const referrerSource = parseReferrerSource(referrer, userAgent);

    // Get geolocation with enhanced detection
    const geo = await getGeoLocation(req, ip);

    // Check if this IP has clicked this link before (for uniqueness)
    const { data: existingClick } = await supabase
      .from('clicks')
      .select('id')
      .eq('link_id', link_id)
      .eq('ip_address', ip)
      .maybeSingle();

    const isUnique = !existingClick;

    // Record the click with enhanced data - all visits are treated as human traffic
    const { error: clickError } = await supabase
      .from('clicks')
      .insert({
        link_id,
        ip_address: ip,
        user_agent: userAgent,
        referrer: referrerSource,
        country: geo.country,
        city: geo.city,
        device_type,
        browser,
        os,
        is_unique: isUnique
      });

    if (clickError) {
      console.error('Error recording click:', clickError);
    }

    // Update click count and last_clicked_at on the link
    await supabase
      .from('links')
      .update({
        click_count: (link.click_count || 0) + 1,
        last_clicked_at: new Date().toISOString()
      })
      .eq('id', link_id);

    console.log(`Click tracked for link ${link_id}: ${device_type}/${browser}/${os} from ${geo.country}/${geo.city} via ${referrerSource}`);

    return new Response(
      JSON.stringify({ success: true, is_unique: isUnique }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Track click error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
