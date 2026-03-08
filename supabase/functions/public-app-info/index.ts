import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/**
 * Public app info endpoint - returns app listing and file info without requiring authentication
 * Used by AppPage for SliceAPPs public app pages
 * 
 * Query params:
 * - id: UUID or short_code of the app (for single app)
 * - list: "true" to return all published apps (for browse page)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const listMode = url.searchParams.get("list") === "true";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // LIST MODE: return all published apps for the browse page
    if (listMode) {
      const { data: apps, error } = await supabase
        .from("app_listings")
        .select("id, short_code, app_name, developer_name, category, icon_url, rating_avg, rating_count, total_downloads, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[public-app-info] List error:", error);
        return new Response(
          JSON.stringify({ apps: [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ apps: apps || [] }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60",
          },
        }
      );
    }

    // SINGLE APP MODE
    if (!id) {
      return new Response(
        JSON.stringify({ error: "Missing id parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if id is a UUID or short_code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase
      .from("app_listings")
      .select("*");

    if (isUuid) {
      query = query.eq("id", id);
    } else {
      query = query.eq("short_code", id);
    }

    const { data: app, error: appError } = await query.single();

    if (appError || !app) {
      console.log("[public-app-info] App not found:", appError);
      return new Response(
        JSON.stringify({ error: "App not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if app is published
    if (!app.is_published) {
      return new Response(
        JSON.stringify({ error: "This app is not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load file info
    let fileInfo = null;
    let fileUnavailable: string | null = null;

    const { data: fileData, error: fileError } = await supabase
      .from("slicebox_files")
      .select("file_id, file_size, storage_path, original_name, password_hash, is_deleted, expires_at, download_count")
      .eq("id", app.file_id)
      .single();

    if (fileError || !fileData) {
      fileUnavailable = "File not found";
    } else if (fileData.is_deleted) {
      fileUnavailable = "This file has been deleted";
    } else if (fileData.expires_at && new Date(fileData.expires_at) < new Date()) {
      fileUnavailable = "This file has expired";
    } else {
      fileInfo = {
        file_id: fileData.file_id,
        file_size: fileData.file_size,
        original_name: fileData.original_name,
        is_password_protected: !!fileData.password_hash,
        download_count: fileData.download_count || 0,
      };
    }

    // Load reviews
    const { data: reviewsData } = await supabase
      .from("app_reviews")
      .select("id, rating, review_text, created_at, user_id")
      .eq("app_id", app.id)
      .order("created_at", { ascending: false })
      .limit(20);

    console.log(`[public-app-info] Found app: ${app.short_code || app.id} (${app.app_name})`);

    return new Response(
      JSON.stringify({
        app: {
          id: app.id,
          short_code: app.short_code,
          app_name: app.app_name,
          developer_name: app.developer_name,
          category: app.category,
          version_name: app.version_name,
          version_code: app.version_code,
          short_description: app.short_description,
          full_description: app.full_description,
          whats_new: app.whats_new,
          icon_url: app.icon_url,
          screenshots: app.screenshots,
          promo_banner_url: app.promo_banner_url,
          rating_avg: app.rating_avg,
          rating_count: app.rating_count,
          total_downloads: app.total_downloads,
          release_date: app.release_date,
          file_id: app.file_id,
        },
        fileInfo,
        fileUnavailable,
        reviews: reviewsData || [],
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
        } 
      }
    );
  } catch (error) {
    console.error("[public-app-info] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});