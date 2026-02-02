import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/**
 * Public file info endpoint - returns file metadata without requiring authentication
 * Used by ShortFileView for SliceBox and LittleSlice file pages
 * 
 * Query params:
 * - shortCode: The short code of the file (required)
 * OR
 * - fileId: Direct file ID lookup (required)
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
    const shortCode = url.searchParams.get("shortCode");
    const fileId = url.searchParams.get("fileId");

    if (!shortCode && !fileId) {
      return new Response(
        JSON.stringify({ error: "Missing shortCode or fileId parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role key for public access (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query - select only non-sensitive fields
    let query = supabase
      .from("slicebox_files")
      .select("file_id, short_code, original_name, file_size, mime_type, expires_at, download_count, is_deleted, service_type");

    if (shortCode) {
      query = query.eq("short_code", shortCode);
    } else if (fileId) {
      query = query.eq("file_id", fileId);
    }

    const { data: file, error: fetchError } = await query.single();

    if (fetchError || !file) {
      console.log("[public-file-info] File not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "File not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if file is deleted
    if (file.is_deleted) {
      return new Response(
        JSON.stringify({ error: "This file has been deleted" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if file has expired
    if (file.expires_at && new Date(file.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This file has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if file has a password (don't reveal the hash, just a boolean)
    const { data: passwordCheck } = await supabase
      .from("slicebox_files")
      .select("password_hash")
      .eq("file_id", file.file_id)
      .single();

    const isPasswordProtected = !!passwordCheck?.password_hash;

    console.log(`[public-file-info] Found file: ${file.short_code} (${file.original_name})`);

    return new Response(
      JSON.stringify({
        fileId: file.file_id,
        shortCode: file.short_code,
        originalName: file.original_name,
        fileSize: file.file_size,
        mimeType: file.mime_type,
        expiresAt: file.expires_at,
        isPasswordProtected,
        downloadCount: file.download_count || 0,
        serviceType: file.service_type || "sb",
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
    console.error("[public-file-info] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
