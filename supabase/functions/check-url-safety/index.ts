import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Domain blacklist for known malicious sites
const BLACKLISTED_DOMAINS = new Set([
  // Crypto scams
  'bitcoin-generator.online',
  'crypto-doubler.com',
  'ethgiveaway.org',
  'free-bitcoin-now.com',
  // Phishing
  'paypa1.com',
  'amaz0n-secure.com',
  'app1e-id.com',
  'microsofft-verify.com',
  // Adult content domains (common patterns)
  'xnxx.com',
  'pornhub.com',
  'xvideos.com',
  'xhamster.com',
  'redtube.com',
  'youporn.com',
  'tube8.com',
  'spankbang.com',
  'brazzers.com',
  'chaturbate.com',
  'livejasmin.com',
  'stripchat.com',
  'cam4.com',
  'bongacams.com',
  'myfreecams.com',
  'onlyfans.com',
]);

// Phishing patterns
const PHISHING_PATTERNS = [
  /paypal.*\.(?!paypal\.com)/i,
  /apple.*\.(?!apple\.com)/i,
  /microsoft.*\.(?!microsoft\.com)/i,
  /google.*\.(?!google\.com|googleapis\.com|gstatic\.com)/i,
  /amazon.*\.(?!amazon\.|amazonaws\.com)/i,
  /facebook.*\.(?!facebook\.com|fb\.com)/i,
  /netflix.*\.(?!netflix\.com)/i,
  /bank.*login/i,
  /secure.*update.*account/i,
  /verify.*account.*immediately/i,
  /password.*reset.*urgent/i,
  /suspended.*account/i,
  /confirm.*identity/i,
];

// Scam keywords
const SCAM_KEYWORDS = [
  'freebit', 'miner', 'crack', 'hack', 'cheat', 'keygen', 'warez',
  'pirate', 'freemoney', 'getrich', 'bitcoin-generator', 'crypto-doubler',
  'wallet-verify', 'seed-phrase', 'private-key', 'metamask-verify',
];

// Adult content indicators for content scanning
const ADULT_KEYWORDS = [
  'porn', 'xxx', 'sex', 'nude', 'naked', 'adult', 'erotic', 'nsfw',
  'hentai', 'camgirl', 'webcam girl', 'live sex', 'xxx video',
  'adult content', 'explicit', 'hardcore', 'milf', 'teen porn',
];

// Suspicious TLDs
const SUSPICIOUS_TLDS = ['.ru', '.xyz', '.win', '.click', '.top', '.tk', '.ml', '.ga', '.cf', '.gq'];

interface SafetyResult {
  status: 'safe' | 'unsafe' | 'suspicious' | 'unknown';
  threats: string[];
  message: string;
  riskScore: number;
  riskFactors: string[];
  redirectCount?: number;
  detectedIssues?: string[];
}

interface CacheEntry {
  result: SafetyResult;
  cachedAt: number;
}

// In-memory cache (24 hour TTL)
const scanCache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCachedResult(url: string): SafetyResult | null {
  const entry = scanCache.get(url);
  if (entry && (Date.now() - entry.cachedAt) < CACHE_TTL) {
    console.log(`Cache hit for: ${url}`);
    return entry.result;
  }
  if (entry) {
    scanCache.delete(url);
  }
  return null;
}

function setCachedResult(url: string, result: SafetyResult): void {
  scanCache.set(url, { result, cachedAt: Date.now() });
}

// Check domain against blacklist
function checkBlacklist(hostname: string): { isBlacklisted: boolean; category: string | null } {
  const lowerHostname = hostname.toLowerCase();
  
  // Direct match
  if (BLACKLISTED_DOMAINS.has(lowerHostname)) {
    return { isBlacklisted: true, category: 'Blacklisted Domain' };
  }
  
  // Check if it's a subdomain of a blacklisted domain
  for (const domain of BLACKLISTED_DOMAINS) {
    if (lowerHostname.endsWith('.' + domain)) {
      return { isBlacklisted: true, category: 'Blacklisted Domain' };
    }
  }
  
  return { isBlacklisted: false, category: null };
}

// Analyze URL patterns for phishing and scams
function analyzeUrlPatterns(url: string): { score: number; factors: string[]; threats: string[] } {
  let score = 0;
  const factors: string[] = [];
  const threats: string[] = [];
  
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const fullUrl = url.toLowerCase();

    // Check scam keywords
    for (const keyword of SCAM_KEYWORDS) {
      if (fullUrl.includes(keyword)) {
        score += 50;
        factors.push(`Scam keyword detected: ${keyword}`);
        threats.push('Potential Scam');
        break;
      }
    }

    // Check suspicious TLDs
    for (const tld of SUSPICIOUS_TLDS) {
      if (hostname.endsWith(tld)) {
        score += 15;
        factors.push(`Suspicious TLD: ${tld}`);
        break;
      }
    }

    // Check phishing patterns
    for (const pattern of PHISHING_PATTERNS) {
      if (pattern.test(fullUrl)) {
        score += 70;
        factors.push('Phishing pattern detected');
        threats.push('Phishing');
        break;
      }
    }

    // Check for IP-based URLs
    if (/^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
      score += 25;
      factors.push('IP-based URL (suspicious)');
    }

    // Check for extremely long URLs (obfuscation)
    if (url.length > 500) {
      score += 10;
      factors.push('Unusually long URL');
    }

    // Check for dangerous protocols
    if (parsed.protocol === 'data:' || parsed.protocol === 'javascript:') {
      score += 90;
      factors.push('Dangerous protocol');
      threats.push('Malicious Protocol');
    }

  } catch (e) {
    score += 30;
    factors.push('Invalid URL format');
  }

  return { score, factors, threats };
}

// Test for redirect chains
async function testRedirects(url: string): Promise<{ count: number; finalUrl: string; suspicious: boolean }> {
  let redirectCount = 0;
  let currentUrl = url;
  const startTime = Date.now();
  const maxRedirects = 10;
  const visitedUrls = new Set<string>();

  try {
    while (redirectCount < maxRedirects) {
      if (visitedUrls.has(currentUrl)) {
        return { count: redirectCount, finalUrl: currentUrl, suspicious: true };
      }
      visitedUrls.add(currentUrl);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(currentUrl, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
          headers: { 'User-Agent': 'SliceURL-SafetyChecker/1.0' },
        });
        
        clearTimeout(timeout);
        const location = response.headers.get('location');
        
        if (response.status >= 300 && response.status < 400 && location) {
          redirectCount++;
          try {
            currentUrl = new URL(location, currentUrl).toString();
          } catch {
            currentUrl = location;
          }

          const elapsed = Date.now() - startTime;
          if (redirectCount > 3 && elapsed < 2000) {
            return { count: redirectCount, finalUrl: currentUrl, suspicious: true };
          }
        } else {
          break;
        }
      } catch {
        clearTimeout(timeout);
        break;
      }
    }
  } catch (e) {
    console.error('Redirect test error:', e);
  }

  return { count: redirectCount, finalUrl: currentUrl, suspicious: redirectCount > 3 };
}

// Fetch and analyze page content
async function analyzePageContent(url: string): Promise<{ isAdult: boolean; isMalware: boolean; factors: string[] }> {
  const factors: string[] = [];
  let isAdult = false;
  let isMalware = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'SliceURL-SafetyChecker/1.0' },
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      return { isAdult, isMalware, factors };
    }

    const html = await response.text();
    const lowerHtml = html.toLowerCase();

    // Check meta tags for adult content
    const metaMatch = lowerHtml.match(/<meta[^>]*name=["']rating["'][^>]*content=["']([^"']+)["']/i);
    if (metaMatch && (metaMatch[1].toLowerCase().includes('adult') || metaMatch[1].toLowerCase().includes('mature'))) {
      isAdult = true;
      factors.push('Adult content rating in meta tags');
    }

    // Check for adult keywords in title and meta description
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].toLowerCase() : '';
    
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].toLowerCase() : '';

    let adultKeywordCount = 0;
    for (const keyword of ADULT_KEYWORDS) {
      if (title.includes(keyword) || description.includes(keyword)) {
        adultKeywordCount++;
      }
    }

    if (adultKeywordCount >= 2) {
      isAdult = true;
      factors.push('Adult content keywords detected in page metadata');
    }

    // Check for malware indicators
    if (lowerHtml.includes('document.write(unescape') || 
        lowerHtml.includes('eval(function(p,a,c,k,e,d)') ||
        lowerHtml.includes('fromcharcode')) {
      isMalware = true;
      factors.push('Obfuscated/malicious JavaScript detected');
    }

  } catch (e) {
    console.log('Page content analysis failed:', e);
  }

  return { isAdult, isMalware, factors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Safety check started for: ${url}`);

    // Check cache first
    const cachedResult = getCachedResult(url);
    if (cachedResult) {
      return new Response(
        JSON.stringify(cachedResult),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let riskScore = 0;
    const riskFactors: string[] = [];
    const threats: string[] = [];
    const detectedIssues: string[] = [];

    // Parse URL
    let hostname = '';
    try {
      hostname = new URL(url).hostname.toLowerCase();
    } catch {
      return new Response(
        JSON.stringify({
          status: 'suspicious',
          threats: ['Invalid URL'],
          message: 'Invalid URL format',
          riskScore: 50,
          riskFactors: ['Invalid URL format'],
          detectedIssues: ['Invalid URL'],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Check blacklist
    const blacklistCheck = checkBlacklist(hostname);
    if (blacklistCheck.isBlacklisted) {
      riskScore += 80;
      riskFactors.push('Domain is on security blacklist');
      threats.push(blacklistCheck.category!);
      detectedIssues.push('🛑 Blacklisted Domain');
    }

    // Step 2: URL pattern analysis
    const patternAnalysis = analyzeUrlPatterns(url);
    riskScore += patternAnalysis.score;
    riskFactors.push(...patternAnalysis.factors);
    threats.push(...patternAnalysis.threats);
    
    if (patternAnalysis.threats.includes('Phishing')) {
      detectedIssues.push('⚠️ Phishing Risk');
    }
    if (patternAnalysis.threats.includes('Potential Scam')) {
      detectedIssues.push('⚠️ Scam Indicators');
    }

    // Step 3: Redirect chain test
    const redirectTest = await testRedirects(url);
    if (redirectTest.suspicious) {
      riskScore += 30;
      riskFactors.push(`Excessive redirects: ${redirectTest.count}`);
      detectedIssues.push('🔄 Suspicious Redirect Chain');
    }

    // Step 4: Google Safe Browsing API check
    const apiKey = Deno.env.get('GOOGLE_SAFE_BROWSING_API_KEY');
    if (apiKey) {
      try {
        const safeBrowsingUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
        
        const requestBody = {
          client: { clientId: 'sliceurl', clientVersion: '1.0.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }, { url: redirectTest.finalUrl }]
          }
        };

        const response = await fetch(safeBrowsingUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.matches && data.matches.length > 0) {
            riskScore += 90;
            riskFactors.push('Google Safe Browsing: Threat detected');
            
            for (const match of data.matches) {
              switch (match.threatType) {
                case 'MALWARE':
                  threats.push('Malware');
                  detectedIssues.push('🛑 Malware Detected');
                  break;
                case 'SOCIAL_ENGINEERING':
                  threats.push('Phishing');
                  detectedIssues.push('⚠️ Phishing Warning');
                  break;
                case 'UNWANTED_SOFTWARE':
                  threats.push('Unwanted Software');
                  detectedIssues.push('⚠️ Unwanted Software');
                  break;
                case 'POTENTIALLY_HARMFUL_APPLICATION':
                  threats.push('Harmful Application');
                  detectedIssues.push('⚠️ Harmful Application');
                  break;
              }
            }
          }
        }
      } catch (e) {
        console.error('Google Safe Browsing check failed:', e);
      }
    }

    // Step 5: Page content analysis
    const contentAnalysis = await analyzePageContent(redirectTest.finalUrl || url);
    riskFactors.push(...contentAnalysis.factors);
    
    if (contentAnalysis.isAdult) {
      riskScore += 60;
      threats.push('Adult Content');
      detectedIssues.push('⚠️ Adult Material');
    }
    
    if (contentAnalysis.isMalware) {
      riskScore += 80;
      threats.push('Malware');
      detectedIssues.push('🛑 Malware Risk');
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);

    // Determine final status
    let status: 'safe' | 'unsafe' | 'suspicious' | 'unknown';
    let message: string;

    // Unique threats
    const uniqueThreats = [...new Set(threats)];
    const uniqueIssues = [...new Set(detectedIssues)];

    if (uniqueThreats.includes('Malware') || uniqueThreats.includes('Phishing') || riskScore >= 70) {
      status = 'unsafe';
      message = 'Unsafe link - threats detected';
    } else if (uniqueThreats.includes('Adult Content') || riskScore >= 40) {
      status = 'suspicious';
      message = 'Potentially unsafe content';
    } else if (riskScore >= 20) {
      status = 'suspicious';
      message = 'Minor security concerns';
    } else if (!apiKey && riskScore === 0) {
      status = 'unknown';
      message = 'Limited safety verification';
    } else {
      status = 'safe';
      message = 'No threats detected';
    }

    const result: SafetyResult = {
      status,
      threats: uniqueThreats,
      message,
      riskScore,
      riskFactors,
      redirectCount: redirectTest.count,
      detectedIssues: uniqueIssues,
    };

    // Cache the result
    setCachedResult(url, result);

    console.log(`Safety check complete: ${url} - Status: ${status}, Risk: ${riskScore}%`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Safety check error:', error);
    return new Response(
      JSON.stringify({
        status: 'unknown',
        threats: [],
        message: 'Safety check failed',
        riskScore: 0,
        riskFactors: [],
        detectedIssues: [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
