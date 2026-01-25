import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting - stricter for creepy URLs to prevent abuse
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // 5 requests per window (stricter than regular shorten)
const RATE_WINDOW = 60000; // 60 seconds

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

const SUBDOMAINS = [
  "login", "support", "secure", "account", "service", 
  "verify", "update", "portal", "access", "auth",
  "signin", "validate", "confirm", "security", "help"
];

const PATH_WORDS = [
  "update_required", "document_review", "security_check", 
  "account_review", "verification_pending", "action_needed",
  "confirm_identity", "review_activity", "secure_login",
  "validate_session", "pending_review", "access_request"
];

function generateRandomId(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    if (!checkRateLimit(clientIp)) {
      console.log(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate creepy-looking short code
    let shortCode: string;
    let attempts = 0;
    const maxAttempts = 20;

    do {
      const subdomain = pickRandom(SUBDOMAINS);
      const randomId = generateRandomId(6);
      const pathWord = pickRandom(PATH_WORDS);
      shortCode = `${subdomain}_${randomId}_${pathWord}`;
      
      // Check if this code already exists
      const { data: existing } = await supabase
        .from("links")
        .select("id")
        .eq("short_code", shortCode)
        .single();
      
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return new Response(
        JSON.stringify({ error: "Failed to generate unique code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the link
    const { data: link, error: insertError } = await supabase
      .from("links")
      .insert({
        original_url: url,
        short_code: shortCode,
        user_id: null,
        is_creepy: true,
        creepy_style: "security_simulation",
      })
      .select("id, short_code")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment global counter
    await supabase.rpc("increment_global_counter", { 
      counter_name: "total_links_created",
      increment_by: 1 
    });

    const shortUrl = `https://sliceurl.app/s/${shortCode}`;

    return new Response(
      JSON.stringify({
        success: true,
        short_code: shortCode,
        short_url: shortUrl,
        id: link.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});