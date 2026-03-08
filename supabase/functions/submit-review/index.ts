import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appId, rating, reviewText, browserFingerprint, displayName } = await req.json();

    if (!appId || !rating || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid rating (1-5 required)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP from headers
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfConnectingIp = req.headers.get("cf-connecting-ip");
    const ipAddress = cfConnectingIp || (forwarded ? forwarded.split(",")[0].trim() : null) || realIp || "unknown";

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header if present
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    // Check if this IP already has a review for this app
    const { data: existingReview, error: checkError } = await supabase
      .from("app_reviews")
      .select("*")
      .eq("app_id", appId)
      .eq("ip_address", ipAddress)
      .maybeSingle();

    if (checkError) {
      console.error("Check error:", checkError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check existing review" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingReview) {
      // Return existing review - one review per IP per app
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "existing",
          review: existingReview,
          message: "You have already reviewed this app"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new review
    const { data: newReview, error: insertError } = await supabase
      .from("app_reviews")
      .insert({
        app_id: appId,
        rating: Math.round(rating),
        review_text: reviewText?.trim() || null,
        user_id: userId,
        ip_address: ipAddress,
        browser_fingerprint: browserFingerprint || null,
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation (race condition)
      if (insertError.code === "23505") {
        // Fetch and return existing
        const { data: raceReview } = await supabase
          .from("app_reviews")
          .select("*")
          .eq("app_id", appId)
          .eq("ip_address", ipAddress)
          .single();
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            action: "existing",
            review: raceReview,
            message: "You have already reviewed this app"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to submit review" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action: "created",
        review: newReview,
        message: "Review submitted successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Submit review error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
