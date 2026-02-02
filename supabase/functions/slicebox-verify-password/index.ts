import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Disposition",
};

// PBKDF2 password hashing with unique salts
const PBKDF2_ITERATIONS = 100000;

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Handle new PBKDF2 format
  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    
    const salt = base64ToArrayBuffer(parts[1]);
    const expectedHash = parts[2];
    
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const hash = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    return arrayBufferToBase64(hash) === expectedHash;
  }
  
  // Legacy: simple SHA-256 without salt (for backward compatibility)
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const legacyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return legacyHash === storedHash;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId, password } = await req.json();
    console.log("[slicebox-verify-password] Verifying password for file:", fileId);

    if (!fileId || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing fileId or password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch file metadata
    const { data: file, error: fetchError } = await supabase
      .from("slicebox_files")
      .select("password_hash, storage_path, original_name, file_size, mime_type, expires_at, is_deleted")
      .eq("file_id", fileId)
      .single();

    if (fetchError || !file) {
      console.error("[slicebox-verify-password] File not found:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "File not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if file is deleted or expired
    if (file.is_deleted) {
      return new Response(
        JSON.stringify({ success: false, error: "File has been deleted" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.expires_at && new Date(file.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "File has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password using proper comparison (supports legacy + new format)
    const isValid = await verifyPassword(password, file.password_hash);
    if (!isValid) {
      console.log("[slicebox-verify-password] Incorrect password");
      return new Response(
        JSON.stringify({ success: false, error: "Incorrect password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[slicebox-verify-password] Password verified successfully");

    // Get signed URL for download (valid for 5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("slicebox")
      .createSignedUrl(file.storage_path, 300); // 5 minutes

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("[slicebox-verify-password] Failed to create signed URL:", signedUrlError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate download URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment download count
    const { data: currentCount } = await supabase
      .from("slicebox_files")
      .select("download_count")
      .eq("file_id", fileId)
      .single();
    
    if (currentCount) {
      await supabase
        .from("slicebox_files")
        .update({ download_count: (currentCount.download_count || 0) + 1 })
        .eq("file_id", fileId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl: signedUrlData.signedUrl,
        fileName: file.original_name,
        fileSize: file.file_size,
        mimeType: file.mime_type,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[slicebox-verify-password] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
