import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SliceBox = 200MB, LittleSlice = 2GB
const SLICEBOX_MAX_SIZE = 200 * 1024 * 1024; // 200MB
const LITTLESLICE_MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

const SHORT_CODE_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateShortCode(length: number = 4): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += SHORT_CODE_CHARS.charAt(Math.floor(Math.random() * SHORT_CODE_CHARS.length));
  }
  return result;
}

async function getUniqueShortCode(supabase: any, maxAttempts: number = 10): Promise<string> {
  // Try 4-character codes first
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateShortCode(4);
    const { data } = await supabase
      .from("slicebox_files")
      .select("id")
      .eq("short_code", code)
      .single();
    
    if (!data) return code;
  }
  
  // If 4-char codes are colliding, use 5 characters
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateShortCode(5);
    const { data } = await supabase
      .from("slicebox_files")
      .select("id")
      .eq("short_code", code)
      .single();
    
    if (!data) return code;
  }
  
  // Fallback to 6 characters (practically no collisions)
  return generateShortCode(6);
}

function getMimeTypeExtension(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "application/pdf": ".pdf",
    "application/zip": ".zip",
  };
  return mimeMap[mimeType] || "";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, expiresAt, serviceType = "sb" } = await req.json();
    console.log("[slicebox-upload-url] Starting upload from URL:", url, "Expiry:", expiresAt, "Service:", serviceType);

    // Validate service type
    const validServiceType = serviceType === "ls" ? "ls" : "sb";

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      console.error("[slicebox-upload-url] Invalid URL format");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the file
    console.log("[slicebox-upload-url] Fetching file...");
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SliceBox/1.0 (https://sliceurl.app)",
      },
    });

    if (!response.ok) {
      console.error("[slicebox-upload-url] Failed to fetch URL:", response.status);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch URL: ${response.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check file size - use LittleSlice limit for URL uploads (2GB)
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > LITTLESLICE_MAX_SIZE) {
      console.error("[slicebox-upload-url] File too large:", contentLength);
      return new Response(
        JSON.stringify({ success: false, error: "File exceeds 2GB limit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get content type
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const mimeType = contentType.split(";")[0].trim();

    // Extract filename
    let filename = "file";
    
    // Try Content-Disposition header first
    const disposition = response.headers.get("content-disposition");
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match) {
        filename = match[1].replace(/['"]/g, "");
      }
    }
    
    // Fallback to URL path
    if (filename === "file") {
      const pathParts = parsedUrl.pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.includes(".")) {
        filename = decodeURIComponent(lastPart);
      }
    }

    // Add extension if missing
    if (!filename.includes(".")) {
      filename += getMimeTypeExtension(mimeType);
    }

    console.log("[slicebox-upload-url] Filename:", filename, "MimeType:", mimeType);

    // Get file buffer
    const fileBuffer = await response.arrayBuffer();
    const fileSize = fileBuffer.byteLength;

    if (fileSize > LITTLESLICE_MAX_SIZE) {
      console.error("[slicebox-upload-url] Downloaded file too large:", fileSize);
      return new Response(
        JSON.stringify({ success: false, error: "File exceeds 2GB limit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate IDs
    const fileId = crypto.randomUUID().split("-")[0] + Date.now().toString(36);
    const deleteToken = crypto.randomUUID();
    const storagePath = `uploads/${fileId}/${filename}`;
    
    // Generate unique short code
    const shortCode = await getUniqueShortCode(supabase);

    console.log("[slicebox-upload-url] Uploading to storage:", storagePath, "ShortCode:", shortCode);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("slicebox")
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[slicebox-upload-url] Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to upload file to storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert metadata with short_code and service_type
    const { error: dbError } = await supabase.from("slicebox_files").insert({
      file_id: fileId,
      original_name: filename,
      file_size: fileSize,
      mime_type: mimeType,
      storage_path: storagePath,
      user_id: null,
      delete_token: deleteToken,
      expires_at: expiresAt || null,
      short_code: shortCode,
      service_type: validServiceType,
    });

    if (dbError) {
      console.error("[slicebox-upload-url] Database insert error:", dbError);
      // Cleanup storage
      await supabase.storage.from("slicebox").remove([storagePath]);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save file metadata" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[slicebox-upload-url] Upload complete. FileId:", fileId, "ShortCode:", shortCode);

    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        shortCode,
        serviceType: validServiceType,
        originalName: filename,
        fileSize,
        mimeType,
        deleteToken,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[slicebox-upload-url] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
