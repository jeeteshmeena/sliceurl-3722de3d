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

// Check if IP is private/local — these can't be geolocated
function isPrivateIp(ip: string): boolean {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') return true;
  if (ip.startsWith('192.168.') || ip.startsWith('10.')) return true;
  if (ip.startsWith('172.')) {
    const second = parseInt(ip.split('.')[1] || '0', 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true;
  return false;
}

// Try a single HTTPS geo provider with timeout
async function tryGeoProvider(
  url: string,
  parser: (data: any) => Partial<GeoResult>,
  label: string
): Promise<Partial<GeoResult> | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2500),
      headers: { 'User-Agent': 'SliceURL-Analytics/1.0' },
    });
    if (!response.ok) {
      console.log(`[geo:${label}] HTTP ${response.status}`);
      return null;
    }
    const data = await response.json();
    const parsed = parser(data);
    if (parsed.city && parsed.city !== 'Unknown') {
      console.log(`[geo:${label}] OK -> ${parsed.country}/${parsed.city}/${parsed.region || '-'}`);
      return parsed;
    }
    console.log(`[geo:${label}] no city in response`);
    return parsed.country ? parsed : null;
  } catch (e) {
    console.log(`[geo:${label}] failed: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

// Normalize a city string for consensus comparison
function normCity(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Query multiple geo providers in parallel and pick the consensus (majority) city.
// This dramatically improves accuracy for mobile carrier IPs where a single provider
// often returns the carrier's hub city instead of the user's actual location.
async function consensusGeo(ip: string): Promise<Partial<GeoResult> | null> {
  const providers: Array<Promise<Partial<GeoResult> | null>> = [
    tryGeoProvider(
      `https://ipwho.is/${ip}?fields=success,country,city,region`,
      (d) => d.success === false ? {} : ({ country: d.country, city: d.city, region: d.region }),
      'ipwho.is'
    ),
    tryGeoProvider(
      `https://ipapi.co/${ip}/json/`,
      (d) => ({
        country: d.country_name || (d.country ? getCountryName(d.country) : undefined),
        city: d.city,
        region: d.region,
      }),
      'ipapi.co'
    ),
    tryGeoProvider(
      `https://freeipapi.com/api/json/${ip}`,
      (d) => ({ country: d.countryName, city: d.cityName, region: d.regionName }),
      'freeipapi.com'
    ),
    tryGeoProvider(
      `https://api.iplocation.net/?ip=${ip}`,
      (d) => ({ country: d.country_name }),
      'iplocation.net'
    ),
    tryGeoProvider(
      `https://get.geojs.io/v1/ip/geo/${ip}.json`,
      (d) => ({ country: d.country, city: d.city, region: d.region }),
      'geojs.io'
    ),
  ];

  const results = (await Promise.all(providers)).filter(Boolean) as Partial<GeoResult>[];
  if (results.length === 0) return null;

  // Tally cities by normalized name; keep original casing of first occurrence
  const cityVotes = new Map<string, { count: number; original: string; region?: string; country?: string }>();
  for (const r of results) {
    if (!r.city) continue;
    const key = normCity(r.city);
    if (key === '' || key === 'unknown') continue;
    const existing = cityVotes.get(key);
    if (existing) {
      existing.count += 1;
      if (!existing.region && r.region) existing.region = r.region;
      if (!existing.country && r.country) existing.country = r.country;
    } else {
      cityVotes.set(key, { count: 1, original: r.city, region: r.region, country: r.country });
    }
  }

  // Pick the city with the most votes (ties broken by first inserted, which is fastest provider)
  let best: { count: number; original: string; region?: string; country?: string } | null = null;
  for (const v of cityVotes.values()) {
    if (!best || v.count > best.count) best = v;
  }

  // Fallback: no city consensus, just take first known country
  const country = best?.country || results.find(r => r.country)?.country;
  const region = best?.region || results.find(r => r.region)?.region;

  console.log(`[geo:consensus] votes=${JSON.stringify(Array.from(cityVotes.entries()).map(([k,v]) => [k, v.count]))} → ${best?.original || 'none'}`);

  return {
    country: country || 'Unknown',
    city: best?.original || 'Unknown',
    region: region || 'Unknown',
  };
}

// Enhanced geolocation: edge headers first, then HTTPS IP lookup chain
async function getGeoLocation(req: Request, ip: string): Promise<GeoResult> {
  const result: GeoResult = { country: 'Unknown', city: 'Unknown', region: 'Unknown' };

  // Priority 1: Cloudflare-style headers (only present if a CF proxy sits in front)
  const cfCountry = req.headers.get('cf-ipcountry');
  const cfCity = req.headers.get('cf-ipcity');
  const cfRegion = req.headers.get('cf-region');
  if (cfCountry && cfCountry !== 'XX' && cfCity) {
    result.country = getCountryName(cfCountry);
    result.city = cfCity;
    result.region = cfRegion || 'Unknown';
    console.log(`[geo:cf-headers] ${result.country}/${result.city}`);
    return result;
  }

  // Priority 2: Vercel headers
  const vercelCountry = req.headers.get('x-vercel-ip-country');
  const vercelCity = req.headers.get('x-vercel-ip-city');
  const vercelRegion = req.headers.get('x-vercel-ip-country-region');
  if (vercelCountry && vercelCity) {
    result.country = getCountryName(vercelCountry);
    result.city = decodeURIComponent(vercelCity);
    result.region = vercelRegion ? decodeURIComponent(vercelRegion) : 'Unknown';
    console.log(`[geo:vercel-headers] ${result.country}/${result.city}`);
    return result;
  }

  // Priority 3: HTTPS IP-based geolocation (Supabase Edge runtime has no edge headers)
  if (isPrivateIp(ip)) {
    console.log(`[geo] skipping lookup, private/unknown ip: ${ip}`);
    // Still keep country if cf gave it
    if (cfCountry && cfCountry !== 'XX') result.country = getCountryName(cfCountry);
    return result;
  }

  // Multi-provider consensus voting — much more accurate than single-provider chain,
  // especially for mobile carrier IPs where one provider may report the carrier hub.
  const consensus = await consensusGeo(ip);
  if (consensus) {
    if (consensus.city && consensus.city !== 'Unknown') result.city = consensus.city;
    if (consensus.country && consensus.country !== 'Unknown') result.country = consensus.country;
    if (consensus.region && consensus.region !== 'Unknown') result.region = consensus.region;
  }

  // Final fallback: keep CF country if present
  if (result.country === 'Unknown' && cfCountry && cfCountry !== 'XX') {
    result.country = getCountryName(cfCountry);
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

    // If this link was created via the public API, attribute the click to
    // the API key so the developer dashboard usage counter reflects real traffic.
    if (link.api_key_id) {
      const { data: keyRow } = await supabase
        .from('api_keys')
        .select('id, requests_today, rate_limit_reset_at')
        .eq('id', link.api_key_id)
        .maybeSingle();

      if (keyRow) {
        const now = new Date();
        const resetAt = new Date(keyRow.rate_limit_reset_at);
        const past = now >= resetAt;
        await supabase
          .from('api_keys')
          .update({
            requests_today: past ? 1 : (keyRow.requests_today || 0) + 1,
            rate_limit_reset_at: past
              ? new Date(now.getTime() + 86400000).toISOString()
              : keyRow.rate_limit_reset_at,
            last_request_at: now.toISOString(),
          })
          .eq('id', keyRow.id);
      }
    }

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
