import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Legacy redirect handler for /slicebox/:fileId URLs
 * Redirects to the new /sb/:shortCode or /ls/:shortCode format
 */
export default function LegacySliceBoxRedirect() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    async function redirectToNewFormat() {
      if (!fileId) {
        navigate("/slicebox", { replace: true });
        return;
      }

      try {
        // Look up by file_id to get short_code and service_type
        const { data, error: fetchError } = await (supabase
          .from("slicebox_files_safe" as any)
          .select("short_code, service_type, is_deleted")
          .eq("file_id", fileId)
          .single()) as any as { data: { short_code: string | null; service_type: string | null; is_deleted: boolean } | null; error: any };

        if (fetchError || !data) {
          setError(true);
          return;
        }

        if (data.is_deleted) {
          setError(true);
          return;
        }

        // Redirect to new short URL format
        const servicePrefix = data.service_type === "ls" ? "ls" : "sb";
        const shortCode = data.short_code;
        
        if (shortCode) {
          navigate(`/${servicePrefix}/${shortCode}`, { replace: true });
        } else {
          // Fallback: if no short_code exists, show error
          setError(true);
        }
      } catch (err) {
        console.error("Error redirecting legacy URL:", err);
        setError(true);
      }
    }

    redirectToNewFormat();
  }, [fileId, navigate]);

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#0B0B0B] mb-2">File not found</h1>
          <p className="text-[#6B7280]">This file may have been deleted or the link is invalid.</p>
        </div>
      </div>
    );
  }

  // Loading state while redirecting
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#FAFAFA]">
      <div className="w-8 h-8 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
