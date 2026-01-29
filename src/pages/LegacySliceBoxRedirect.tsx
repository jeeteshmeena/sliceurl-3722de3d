import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * LegacySliceBoxRedirect handles backward compatibility for old links:
 * /slicebox/{fileId} -> redirects to new /sb/{shortCode} format
 */
export default function LegacySliceBoxRedirect() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const redirect = async () => {
      if (!fileId) {
        navigate("/", { replace: true });
        return;
      }

      try {
        // Look up file by file_id to get the short_code
        const { data: file, error } = await supabase
          .from("slicebox_files")
          .select("file_id, short_code, service_type")
          .eq("file_id", fileId)
          .single();

        if (error || !file) {
          // If not found, still try to navigate to view page (it will handle the error)
          navigate(`/slicebox/${fileId}`, { replace: true });
          return;
        }

        // If file has a short_code, redirect to new format
        if (file.short_code) {
          const prefix = file.service_type === "ls" ? "ls" : "sb";
          navigate(`/${prefix}/${file.short_code}`, { replace: true });
        } else {
          // No short code yet, go to regular view
          navigate(`/slicebox/${fileId}`, { replace: true });
        }
      } catch (err) {
        console.error("[LegacySliceBoxRedirect] Error:", err);
        navigate(`/slicebox/${fileId}`, { replace: true });
      }
    };

    redirect();
  }, [fileId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-pink-500 mx-auto mb-4" />
        <p className="text-white/70">Redirecting...</p>
      </div>
    </div>
  );
}
