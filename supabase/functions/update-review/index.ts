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
    const { reviewId, rating, reviewText } = await req.json();

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

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Require sign-in — spoofable IP/fingerprint identity is no longer accepted.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "You must be signed in to edit a review" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing review and enforce ownership by authenticated user id
    const { data: existingReview, error: fetchError } = await supabase
      .from("app_reviews")
      .select("id, user_id")
      .eq("id", reviewId)
      .single();

    if (fetchError || !existingReview) {
      return new Response(
        JSON.stringify({ success: false, error: "Review not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingReview.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: "You cannot edit this review" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the review
    const updates: Record<string, unknown> = {};
    if (rating) updates.rating = Math.round(rating);
    if (reviewText !== undefined) updates.review_text = reviewText?.trim() || null;

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
