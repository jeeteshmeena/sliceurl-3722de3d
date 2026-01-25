import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId } = await req.json();
    console.log("[slicebox-download] Generating download URL for file:", fileId);

    if (!fileId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing fileId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role for storage access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch file metadata including encryption info
    const { data: file, error: fetchError } = await supabase
      .from("slicebox_files")
      .select("file_id, storage_path, original_name, file_size, mime_type, expires_at, is_deleted, password_hash, download_count, is_encrypted, encryption_iv")
      .eq("file_id", fileId)
      .single();

    if (fetchError || !file) {
      console.error("[slicebox-download] File not found:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "File not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if file is deleted
    if (file.is_deleted) {
      return new Response(
        JSON.stringify({ success: false, error: "This file has been deleted" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if file has expired
    if (file.expires_at && new Date(file.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "This file has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if file is password protected - require password verification via different endpoint
    if (file.password_hash) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "This file is password protected",
          requiresPassword: true 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[slicebox-download] Generating signed URL for:", file.storage_path);

    // Generate signed URL for download (valid for 5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("slicebox")
      .createSignedUrl(file.storage_path, 300); // 5 minutes

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("[slicebox-download] Failed to create signed URL:", signedUrlError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate download link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment download count
    await supabase
      .from("slicebox_files")
      .update({ download_count: (file.download_count || 0) + 1 })
      .eq("file_id", fileId);

    console.log("[slicebox-download] Download URL generated successfully, encrypted:", !!file.is_encrypted);

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl: signedUrlData.signedUrl,
        fileName: file.original_name,
        fileSize: file.file_size,
        mimeType: file.mime_type,
        // Include encryption metadata for client-side decryption
        isEncrypted: file.is_encrypted || false,
        encryptionIv: file.encryption_iv || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[slicebox-download] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
