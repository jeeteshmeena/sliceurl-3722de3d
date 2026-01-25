import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Country to language mapping
const countryToLanguage: Record<string, string> = {
  US: "en", GB: "en", AU: "en", CA: "en", NZ: "en", IE: "en",
  IN: "hi",
  CN: "zh", TW: "zh", HK: "zh", SG: "zh",
  FR: "fr", BE: "fr", CH: "fr", LU: "fr", MC: "fr",
  DE: "de", AT: "de", LI: "de",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es",
  PT: "pt", BR: "pt", AO: "pt", MZ: "pt",
  SA: "ar", AE: "ar", EG: "ar", MA: "ar", DZ: "ar", IQ: "ar", SY: "ar", 
  JO: "ar", LB: "ar", KW: "ar", QA: "ar", BH: "ar", OM: "ar", YE: "ar", 
  LY: "ar", TN: "ar", SD: "ar",
  RU: "ru", BY: "ru", KZ: "ru", KG: "ru", TJ: "ru",
  JP: "ja",
  KR: "ko", KP: "ko",
  IT: "it", SM: "it", VA: "it",
  ID: "id",
  TR: "tr", CY: "tr",
  LK: "ta",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check various geo headers from different CDNs/proxies
    const headers = req.headers;
    
    // Priority order for country detection
    const countryHeaders = [
      "cf-ipcountry",           // Cloudflare
      "x-vercel-ip-country",    // Vercel
      "x-country",              // Generic
      "x-geo-country",          // Generic
      "fastly-client-geo-country", // Fastly
      "cloudfront-viewer-country", // AWS CloudFront
    ];

    let country: string | null = null;
    let source = "none";

    for (const header of countryHeaders) {
      const value = headers.get(header);
      if (value && value !== "XX") {
        country = value.toUpperCase();
        source = header;
        break;
      }
    }

    // Get city/region if available (Cloudflare headers)
    const city = headers.get("cf-ipcity") || null;
    const region = headers.get("cf-region") || null;

    // Map country to language
    const language = country ? countryToLanguage[country] || null : null;
    
    // Calculate confidence based on source
    let confidence = 0;
    if (country) {
      if (source === "cf-ipcountry") confidence = 85;
      else if (source === "x-vercel-ip-country") confidence = 80;
      else confidence = 70;
    }

    console.log(`[detect-geo] Country: ${country}, Language: ${language}, Source: ${source}`);

    return new Response(
      JSON.stringify({
        country,
        city,
        region,
        language,
        source,
        confidence,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[detect-geo] Error:", error);
    return new Response(
      JSON.stringify({ 
        country: null, 
        language: null, 
        source: "error",
        confidence: 0,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 200, // Return 200 even on error to not break detection flow
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
