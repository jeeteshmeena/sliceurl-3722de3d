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
    console.log("[slicebox-cleanup] Starting expired file cleanup...");

    // Use service role for admin access to storage
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find expired files that haven't been deleted yet
    const now = new Date().toISOString();
    const { data: expiredFiles, error: queryError } = await supabaseAdmin
      .from("slicebox_files")
      .select("id, file_id, storage_path, original_name, expires_at")
      .eq("is_deleted", false)
      .not("expires_at", "is", null)
      .lt("expires_at", now);

    if (queryError) {
      console.error("[slicebox-cleanup] Error querying expired files:", queryError);
      throw queryError;
    }

    if (!expiredFiles || expiredFiles.length === 0) {
      console.log("[slicebox-cleanup] No expired files found");
      return new Response(
        JSON.stringify({ success: true, message: "No expired files to clean up", deletedCount: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[slicebox-cleanup] Found ${expiredFiles.length} expired files to delete`);

    let deletedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each expired file
    for (const file of expiredFiles) {
      try {
        console.log(`[slicebox-cleanup] Deleting file: ${file.original_name} (${file.file_id})`);

        // Delete from storage
        const { error: storageError } = await supabaseAdmin.storage
          .from("slicebox")
          .remove([file.storage_path]);

        if (storageError) {
          console.error(`[slicebox-cleanup] Storage delete error for ${file.file_id}:`, storageError);
          // Continue anyway - file might already be gone
        }

        // Mark as deleted in database
        const { error: updateError } = await supabaseAdmin
          .from("slicebox_files")
          .update({ is_deleted: true })
          .eq("id", file.id);

        if (updateError) {
          console.error(`[slicebox-cleanup] Database update error for ${file.file_id}:`, updateError);
          errors.push(`Failed to mark ${file.file_id} as deleted: ${updateError.message}`);
          errorCount++;
        } else {
          deletedCount++;
          console.log(`[slicebox-cleanup] Successfully deleted: ${file.original_name}`);
        }
      } catch (fileError) {
        console.error(`[slicebox-cleanup] Error processing file ${file.file_id}:`, fileError);
        errors.push(`Error processing ${file.file_id}: ${fileError}`);
        errorCount++;
      }
    }

    const summary = {
      success: true,
      message: `Cleanup complete. Deleted ${deletedCount} files, ${errorCount} errors.`,
      deletedCount,
      errorCount,
      totalProcessed: expiredFiles.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("[slicebox-cleanup] Cleanup summary:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[slicebox-cleanup] Fatal error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
