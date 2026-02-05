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
    const { reviewId, rating, reviewText, deviceId, displayName } = await req.json();

    if (!reviewId) {
      return new Response(
        JSON.stringify({ success: false, error: "Review ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rating && (rating < 1 || rating > 5)) {
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

    // Fetch the existing review
    const { data: existingReview, error: fetchError } = await supabase
      .from("app_reviews")
      .select("*")
      .eq("id", reviewId)
      .single();

    if (fetchError || !existingReview) {
      return new Response(
        JSON.stringify({ success: false, error: "Review not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check ownership: user owns it OR device_id matches OR IP matches (for guest reviews)
    const canEdit =
      (userId && existingReview.user_id === userId) ||
      (deviceId && existingReview.browser_fingerprint === deviceId) ||
      (existingReview.ip_address === ipAddress && !existingReview.browser_fingerprint);

    if (!canEdit) {
      return new Response(
        JSON.stringify({ success: false, error: "You cannot edit this review" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the review
    const updates: Record<string, unknown> = {};
    if (rating) updates.rating = Math.round(rating);
    if (reviewText !== undefined) updates.review_text = reviewText?.trim() || null;
    if (displayName !== undefined) updates.display_name = displayName?.trim() || null;
    if (deviceId && !existingReview.browser_fingerprint) {
      updates.browser_fingerprint = deviceId;
    }

    const { data: updatedReview, error: updateError } = await supabase
      .from("app_reviews")
      .update(updates)
      .eq("id", reviewId)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update review" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        review: updatedReview,
        message: "Review updated successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Update review error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
