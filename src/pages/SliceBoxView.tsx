import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Download, Lock, Eye, EyeOff, ArrowLeft, HardDrive, Clock, AlertTriangle
} from "lucide-react";
import { IsolatedButton, SLICEBOX_COLORS, LITTLESLICE_COLORS } from "@/components/slicebox/IsolatedButton";
import { IsolatedInput } from "@/components/slicebox/IsolatedInput";
import { FilePreview } from "@/components/slicebox/FilePreview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Apple Music inspired gradients
const GRADIENTS = {
  slicebox: "linear-gradient(135deg, #FF2D55 0%, #FF6B6B 100%)",
  littleslice: "linear-gradient(135deg, #FF2D55 0%, #C644FC 100%)",
};

interface FileMetadata {
  fileId: string;
  shortCode: string | null;
  serviceType: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  expiresAt: string | null;
  isPasswordProtected: boolean;
  downloadCount: number;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatExpiryTime(isoString: string | null): string | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  
  if (diffMs <= 0) return "Expired";
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `Expires in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
  if (diffHours > 0) return `Expires in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `Expires in ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
}

export default function SliceBoxView() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<FileMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Determine if this is a temporary file (LittleSlice) or permanent (SliceBox)
  const isTemporary = file?.expiresAt !== null;
  const gradient = isTemporary ? GRADIENTS.littleslice : GRADIENTS.slicebox;
  const brandName = isTemporary ? "LittleSlice" : "SliceBox";

  useEffect(() => {
    async function fetchFileMetadata() {
      if (!fileId) {
        navigate("/slicebox");
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("slicebox_files")
          .select("file_id, short_code, service_type, original_name, file_size, mime_type, storage_path, expires_at, password_hash, download_count, is_deleted")
          .eq("file_id", fileId)
          .single();

        if (fetchError || !data) {
          setError("File not found");
          setLoading(false);
          return;
        }

        if (data.is_deleted) {
          setError("This file has been deleted");
          setLoading(false);
          return;
        }

        // Check expiry
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError("This file has expired");
          setLoading(false);
          return;
        }

        setFile({
          fileId: data.file_id,
          shortCode: data.short_code,
          serviceType: data.service_type || "sb",
          originalName: data.original_name,
          fileSize: data.file_size,
          mimeType: data.mime_type,
          storagePath: data.storage_path,
          expiresAt: data.expires_at,
          isPasswordProtected: !!data.password_hash,
          downloadCount: data.download_count || 0,
        });
        setLoading(false);
      } catch (err) {
        console.error("Error fetching file:", err);
        setError("Failed to load file");
        setLoading(false);
      }
    }

    fetchFileMetadata();
  }, [fileId, navigate]);

  const handleDownload = async () => {
    if (!file) return;

    // If password protected, verify first via edge function
    if (file.isPasswordProtected) {
      if (!password) {
        toast.error("Please enter the password");
        return;
      }

      setVerifying(true);
      try {
        const response = await supabase.functions.invoke("slicebox-verify-password", {
          body: { fileId: file.fileId, password },
        });

        if (response.error || !response.data?.success) {
          toast.error(response.data?.error || "Incorrect password");
          setVerifying(false);
          return;
        }

        // Download using signed URL from edge function
        window.location.href = response.data.downloadUrl;
        toast.success("Download started!");
        setVerifying(false);
      } catch (err) {
        console.error("Password verification failed:", err);
        toast.error("Failed to verify password");
        setVerifying(false);
      }
      return;
    }

    // No password - use download edge function for signed URL
    setDownloading(true);
    try {
      const response = await supabase.functions.invoke("slicebox-download", {
        body: { fileId: file.fileId },
      });

      if (response.error || !response.data?.success) {
        // Handle specific error cases with user-friendly messages
        const errorMessage = response.data?.error || "Download failed";
        if (errorMessage.includes("expired")) {
          toast.error("This file has expired");
        } else if (errorMessage.includes("deleted")) {
          toast.error("This file has been deleted");
        } else if (response.data?.requiresPassword) {
          // This shouldn't happen but handle gracefully
          toast.error("This file requires a password");
        } else {
          toast.error("Failed to download file");
        }
        setDownloading(false);
        return;
      }

      // Redirect to signed download URL
      window.location.href = response.data.downloadUrl;
      toast.success("Download started!");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const expiryText = file ? formatExpiryTime(file.expiresAt) : null;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#FAFAFA]">
        <div className="w-8 h-8 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error || !file) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#FAFAFA]">
        <header className="sticky top-0 z-50 border-b border-[#E8E8E8] bg-white shadow-sm">
          <div className="max-w-4xl mx-auto h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <div 
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ background: GRADIENTS.slicebox }}
              >
                <HardDrive className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold">
                <span className="text-[#0B0B0B]">Slice</span>
                <span className="text-[#6B7280]">Box</span>
              </span>
            </div>
            <IsolatedButton variant="ghost" size="sm" asChild colorScheme="slicebox">
              <Link to="/" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to SliceURL
              </Link>
            </IsolatedButton>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-[#0B0B0B] mb-2">{error || "File not found"}</h1>
            <p className="text-[#6B7280] mb-6">This file may have been deleted or the link is invalid.</p>
            <IsolatedButton asChild colorScheme="slicebox">
              <Link to="/slicebox">Go to SliceBox</Link>
            </IsolatedButton>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: isTemporary ? "#F8FBFC" : "#FAFAFA" }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-50 border-b shadow-sm"
        style={{ backgroundColor: "#FFFFFF", borderColor: isTemporary ? "#E2EEF2" : "#E8E8E8" }}
      >
        <div className="max-w-4xl mx-auto h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div 
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: gradient }}
            >
              {isTemporary ? (
                <Clock className="h-4 w-4 text-white" />
              ) : (
                <HardDrive className="h-4 w-4 text-white" />
              )}
            </div>
            <span className="text-lg font-bold">
              <span className="text-[#0B0B0B]">{isTemporary ? "Little" : "Slice"}</span>
              <span className="text-[#6B7280]">{isTemporary ? "Slice" : "Box"}</span>
            </span>
          </div>
          <IsolatedButton 
            variant="ghost" 
            size="sm" 
            asChild 
            colorScheme={isTemporary ? "littleslice" : "slicebox"}
            className="gap-2 font-medium"
          >
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to SliceURL</span>
            </Link>
          </IsolatedButton>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div 
            className="rounded-2xl border shadow-lg overflow-hidden"
            style={{ backgroundColor: "#FFFFFF", borderColor: isTemporary ? "#E2EEF2" : "#E8E8E8" }}
          >
            {/* File Preview */}
            <div className="p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <FilePreview
                  mimeType={file.mimeType}
                  fileName={file.originalName}
                  size="lg"
                  variant={isTemporary ? "littleslice" : "slicebox"}
                />
              </div>
              <h1 className="text-lg font-bold text-[#0B0B0B] mb-1 break-all">
                {file.originalName}
              </h1>
              <p className="text-sm text-[#6B7280]">
                {formatFileSize(file.fileSize)}
                {file.downloadCount > 0 && ` · ${file.downloadCount} downloads`}
              </p>
              {expiryText && (
                <p 
                  className="text-xs mt-2 font-medium"
                  style={{ color: expiryText === "Expired" ? "#DC2626" : "#6B7280" }}
                >
                  <Clock className="h-3 w-3 inline mr-1" />
                  {expiryText}
                </p>
              )}
            </div>

            {/* Password Input (if protected) */}
            {file.isPasswordProtected && (
              <div className="px-6 pb-4">
                <div 
                  className="p-4 rounded-xl border"
                  style={{ backgroundColor: "rgba(255, 45, 85, 0.1)", borderColor: "rgba(255, 45, 85, 0.3)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="h-4 w-4 text-[#6B7280]" />
                    <span className="text-sm font-medium text-[#0B0B0B]">Password Required</span>
                  </div>
                  <div className="relative">
                    <IsolatedInput
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="pr-10 h-11"
                      colorScheme={isTemporary ? "littleslice" : "slicebox"}
                      onKeyDown={(e) => e.key === "Enter" && handleDownload()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Download Button */}
            <div className="p-6 pt-0">
              <IsolatedButton
                onClick={handleDownload}
                disabled={verifying || downloading}
                colorScheme={isTemporary ? "littleslice" : "slicebox"}
                className="w-full h-12 text-base font-semibold gap-2"
              >
                {verifying ? (
                  <>
                    <div className="h-4 w-4 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : downloading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />
                    Starting download...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download File
                  </>
                )}
              </IsolatedButton>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-[#6B7280] mt-6">
            {isTemporary ? "A Product by SliceBox" : "Powered by SliceURL"}
          </p>
        </motion.div>
      </main>
    </div>
  );
}
