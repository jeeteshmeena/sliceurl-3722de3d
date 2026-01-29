import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileX, AlertCircle } from "lucide-react";

/**
 * ShortFileView handles the new short link format:
 * /sb/{shortCode} - SliceBox files
 * /ls/{shortCode} - LittleSlice files
 * 
 * It looks up the file by short_code and redirects to the full view page.
 */
export default function ShortFileView() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lookupFile = async () => {
      if (!shortCode) {
        setError("Invalid link");
        setLoading(false);
        return;
      }

      try {
        // Look up file by short_code
        const { data: file, error: fetchError } = await supabase
          .from("slicebox_files")
          .select("file_id, short_code, service_type, is_deleted, expires_at")
          .eq("short_code", shortCode)
          .single();

        if (fetchError || !file) {
          console.error("[ShortFileView] File not found:", fetchError);
          setError("File not found");
          setLoading(false);
          return;
        }

        // Check if deleted
        if (file.is_deleted) {
          setError("This file has been deleted");
          setLoading(false);
          return;
        }

        // Check if expired
        if (file.expires_at && new Date(file.expires_at) < new Date()) {
          setError("This file has expired");
          setLoading(false);
          return;
        }

        // Redirect to the full view page with the file_id
        navigate(`/slicebox/${file.file_id}`, { replace: true });
      } catch (err) {
        console.error("[ShortFileView] Error:", err);
        setError("Something went wrong");
        setLoading(false);
      }
    };

    lookupFile();
  }, [shortCode, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-white/70">Loading file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 max-w-md w-full text-center">
          {error.includes("not found") ? (
            <FileX className="h-16 w-16 text-pink-500/50 mx-auto mb-4" />
          ) : (
            <AlertCircle className="h-16 w-16 text-pink-500/50 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold text-white mb-2">
            {error.includes("not found") ? "File Not Found" : "Error"}
          </h1>
          <p className="text-white/60 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-pink-500/25 transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}
