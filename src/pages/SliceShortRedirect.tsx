import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Redirect component for new short link format: /sb/:shortCode or /ls/:shortCode
export default function SliceShortRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine service type from URL path
  const isLittleSlice = location.pathname.startsWith("/ls/");

  useEffect(() => {
    async function resolveShortCode() {
      if (!shortCode) {
        navigate(isLittleSlice ? "/littleslice" : "/slicebox");
        return;
      }

      try {
        // Look up the file by short_code
        const { data, error } = await supabase
          .from("slicebox_files")
          .select("file_id, service_type, is_deleted, expires_at")
          .eq("short_code", shortCode)
          .eq("is_deleted", false)
          .single();

        if (error || !data) {
          // Short code not found, redirect to appropriate service page
          navigate(isLittleSlice ? "/littleslice" : "/slicebox");
          return;
        }

        // Check if expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          navigate(isLittleSlice ? "/littleslice" : "/slicebox");
          return;
        }

        // Redirect to the full view page
        navigate(`/slicebox/${data.file_id}`, { replace: true });
      } catch (err) {
        console.error("Error resolving short code:", err);
        navigate(isLittleSlice ? "/littleslice" : "/slicebox");
      }
    }

    resolveShortCode();
  }, [shortCode, isLittleSlice, navigate]);

  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: isLittleSlice ? "#FFF5F7" : "#FAFAFA" }}>
      <div 
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: isLittleSlice ? "#FF4D6D" : "#FF3B30", borderTopColor: "transparent" }}
      />
    </div>
  );
}
