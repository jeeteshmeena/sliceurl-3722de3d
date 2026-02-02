import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Disposition",
};

/**
 * Unified file streaming endpoint for SliceBox, LittleSlice, and SliceAPPs
 * 
 * Supports:
 * - GET requests with full file streaming
 * - HEAD requests for metadata/verification
 * - Range requests for partial content (resume downloads)
 * 
 * All files are served through this backend endpoint, never directly from storage URLs.
 */
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const method = req.method;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET and HEAD
  if (method !== "GET" && method !== "HEAD") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get fileId from query params or path
    const fileId = url.searchParams.get("fileId");
    const shortCode = url.searchParams.get("shortCode");
    
    if (!fileId && !shortCode) {
      return new Response(
        JSON.stringify({ error: "Missing fileId or shortCode parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[file-stream] ${method} request for ${fileId ? `fileId: ${fileId}` : `shortCode: ${shortCode}`}`);

    // Initialize Supabase client with service role for storage access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch file metadata
    let query = supabase
      .from("slicebox_files")
      .select("file_id, storage_path, original_name, file_size, mime_type, expires_at, is_deleted, password_hash, download_count");
    
    if (fileId) {
      query = query.eq("file_id", fileId);
    } else {
      query = query.eq("short_code", shortCode).eq("is_deleted", false);
    }

    const { data: file, error: fetchError } = await query.single();

    if (fetchError || !file) {
      console.error("[file-stream] File not found:", fetchError);
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

    // Check if file is password protected (for direct access without prior verification)
    const requiresPassword = url.searchParams.get("verified") !== "true" && !!file.password_hash;
    if (requiresPassword) {
      return new Response(
        JSON.stringify({ 
          error: "This file is password protected",
          requiresPassword: true 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine correct MIME type
    let contentType = file.mime_type || "application/octet-stream";
    const fileName = file.original_name || "download";
    
    // Force APK MIME type for .apk files
    if (fileName.toLowerCase().endsWith(".apk")) {
      contentType = "application/vnd.android.package-archive";
    }

    // Build response headers
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000",
      "Content-Length": String(file.file_size),
    };

    // For HEAD requests, return only headers
    if (method === "HEAD") {
      console.log("[file-stream] HEAD request - returning headers only");
      return new Response(null, {
        status: 200,
        headers: responseHeaders,
      });
    }

    // GET request - stream the file
    console.log("[file-stream] Streaming file:", file.storage_path);

    // Check for Range header (partial content request)
    const rangeHeader = req.headers.get("Range");
    let start = 0;
    let end = file.file_size - 1;
    let isPartial = false;

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        start = parseInt(match[1], 10);
        end = match[2] ? parseInt(match[2], 10) : file.file_size - 1;
        isPartial = true;
        console.log(`[file-stream] Range request: ${start}-${end}`);
      }
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("slicebox")
      .download(file.storage_path);

    if (downloadError || !fileData) {
      console.error("[file-stream] Failed to download file:", downloadError);
      return new Response(
        JSON.stringify({ error: "This file is temporarily unavailable. Please try again later." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment download count (async, don't wait)
    (async () => {
      try {
        await supabase
          .from("slicebox_files")
          .update({ download_count: (file.download_count || 0) + 1 })
          .eq("file_id", file.file_id);
        console.log("[file-stream] Download count incremented");
      } catch (err) {
        console.error("[file-stream] Failed to update download count:", err);
      }
    })();

    // Handle partial content (Range requests)
    if (isPartial) {
      const arrayBuffer = await fileData.arrayBuffer();
      const partialData = arrayBuffer.slice(start, end + 1);
      
      return new Response(partialData, {
        status: 206,
        headers: {
          ...responseHeaders,
          "Content-Range": `bytes ${start}-${end}/${file.file_size}`,
          "Content-Length": String(end - start + 1),
        },
      });
    }

    // Full file response
    return new Response(fileData, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error("[file-stream] Error:", error);
    return new Response(
      JSON.stringify({ error: "This file is temporarily unavailable. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
