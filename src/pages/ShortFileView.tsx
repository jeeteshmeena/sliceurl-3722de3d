import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Download, Lock, Eye, EyeOff, Clock, AlertTriangle, HardDrive
} from "lucide-react";
import { IsolatedButton } from "@/components/slicebox/IsolatedButton";
import { IsolatedInput } from "@/components/slicebox/IsolatedInput";
import { FilePreview } from "@/components/slicebox/FilePreview";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileMetadata {
  fileId: string;
  shortCode: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  expiresAt: string | null;
  isPasswordProtected: boolean;
  downloadCount: number;
  serviceType: string;
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

interface ShortFileViewProps {
  expectedServiceType?: "sb" | "ls";
}

export default function ShortFileView({ expectedServiceType }: ShortFileViewProps) {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<FileMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [passwordVerified, setPasswordVerified] = useState(false);

  const isTemporary = file?.serviceType === "ls" || (file?.expiresAt !== null && file?.serviceType !== "sb");
  const accentColor = isTemporary ? "#D0E7EF" : "#FFD64D";
  const brandName = isTemporary ? "LittleSlice" : "SliceBox";

  // Generate preview URL for non-password files
  useEffect(() => {
    async function generatePreviewUrl() {
      if (!file || file.isPasswordProtected && !passwordVerified) return;
      
      const category = getFileCategory(file.mimeType, file.originalName);
      if (category === "image" || category === "video") {
        try {
          const { data } = await supabase.storage
            .from("slicebox")
            .createSignedUrl(file.storagePath, 300);
          
          if (data?.signedUrl) {
            setPreviewUrl(data.signedUrl);
          }
        } catch (err) {
          console.error("Failed to generate preview URL:", err);
        }
      }
    }
    
    generatePreviewUrl();
  }, [file, passwordVerified]);

  useEffect(() => {
    async function fetchFileMetadata() {
      if (!shortCode) {
        navigate("/slicebox");
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("slicebox_files")
          .select("file_id, short_code, original_name, file_size, mime_type, storage_path, expires_at, password_hash, download_count, is_deleted, service_type")
          .eq("short_code", shortCode)
          .eq("is_deleted", false)
          .single();

        if (fetchError || !data) {
          setError("File not found");
          setLoading(false);
          return;
        }

        if (expectedServiceType && data.service_type !== expectedServiceType) {
          const correctPath = data.service_type === "ls" ? `/ls/${shortCode}` : `/sb/${shortCode}`;
          navigate(correctPath, { replace: true });
          return;
        }

        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError("This file has expired");
          setLoading(false);
          return;
        }

        setFile({
          fileId: data.file_id,
          shortCode: data.short_code || shortCode,
          originalName: data.original_name,
          fileSize: data.file_size,
          mimeType: data.mime_type,
          storagePath: data.storage_path,
          expiresAt: data.expires_at,
          isPasswordProtected: !!data.password_hash,
          downloadCount: data.download_count || 0,
          serviceType: data.service_type || "sb",
        });
        setLoading(false);
      } catch (err) {
        console.error("Error fetching file:", err);
        setError("Failed to load file");
        setLoading(false);
      }
    }

    fetchFileMetadata();
  }, [shortCode, navigate, expectedServiceType]);

  const handleDownload = async () => {
    if (!file) return;

    if (file.isPasswordProtected && !passwordVerified) {
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

        setPasswordVerified(true);
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

    setDownloading(true);
    try {
      const response = await supabase.functions.invoke("slicebox-download", {
        body: { fileId: file.fileId },
      });

      if (response.error || !response.data?.success) {
        const errorMessage = response.data?.error || "Download failed";
        if (errorMessage.includes("expired")) {
          toast.error("This file has expired");
        } else if (errorMessage.includes("deleted")) {
          toast.error("This file has been deleted");
        } else {
          toast.error("Failed to download file");
        }
        setDownloading(false);
        return;
      }

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

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#FAFAFA]">
        <div className="w-full max-w-md px-4">
          <div className="bg-white rounded-3xl border border-[#E8E8E8] shadow-xl p-8">
            <div className="flex flex-col items-center">
              <Skeleton className="w-32 h-32 rounded-2xl mb-6" />
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !file) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#FAFAFA] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-3xl border border-[#E8E8E8] shadow-xl p-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-[#0B0B0B] mb-2">{error || "File not found"}</h1>
            <p className="text-[#6B7280] mb-8">This file may have been deleted or the link is invalid.</p>
            <IsolatedButton asChild colorScheme="slicebox" className="w-full h-12">
              <Link to="/slicebox">Go to SliceBox</Link>
            </IsolatedButton>
          </div>
          
          {/* Footer */}
          <p className="text-center text-xs text-[#9CA3AF] mt-8">
            Powered by SliceURL
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-dvh flex flex-col"
      style={{ backgroundColor: isTemporary ? "#F8FBFC" : "#FAFAFA" }}
    >
      {/* No header - clean fullscreen view */}
      
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Main Card */}
          <div 
            className="rounded-3xl border shadow-xl overflow-hidden"
            style={{ 
              backgroundColor: "#FFFFFF", 
              borderColor: isTemporary ? "#E2EEF2" : "#E8E8E8" 
            }}
          >
            {/* Large Preview */}
            <div className="p-8 pb-6 flex flex-col items-center">
              <div className="mb-6">
                <FilePreview
                  mimeType={file.mimeType}
                  fileName={file.originalName}
                  storagePath={file.storagePath}
                  signedUrl={previewUrl || undefined}
                  isPasswordProtected={file.isPasswordProtected && !passwordVerified}
                  size="xl"
                  variant={isTemporary ? "littleslice" : "slicebox"}
                />
              </div>
              
              {/* File Info */}
              <h1 className="text-lg font-bold text-[#0B0B0B] text-center mb-2 break-all px-4">
                {file.originalName}
              </h1>
              <div className="flex items-center gap-3 text-sm text-[#6B7280]">
                <span>{formatFileSize(file.fileSize)}</span>
                {file.downloadCount > 0 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-[#D1D5DB]" />
                    <span>{file.downloadCount} download{file.downloadCount !== 1 ? "s" : ""}</span>
                  </>
                )}
              </div>
              
              {/* Expiry Badge (LittleSlice only) */}
              {expiryText && (
                <div 
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: expiryText === "Expired" ? "#FEE2E2" : `${accentColor}40`,
                    color: expiryText === "Expired" ? "#DC2626" : "#0B0B0B"
                  }}
                >
                  <Clock className="h-3 w-3" />
                  {expiryText}
                </div>
              )}
            </div>

            {/* Password Input (if protected) */}
            {file.isPasswordProtected && !passwordVerified && (
              <div className="px-6 pb-2">
                <div 
                  className="p-4 rounded-2xl border"
                  style={{ backgroundColor: `${accentColor}15`, borderColor: `${accentColor}40` }}
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
                      className="pr-10 h-12 rounded-xl"
                      colorScheme={isTemporary ? "littleslice" : "slicebox"}
                      onKeyDown={(e) => e.key === "Enter" && handleDownload()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#0B0B0B] transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Download Button */}
            <div className="p-6 pt-4">
              <IsolatedButton
                onClick={handleDownload}
                disabled={verifying || downloading}
                colorScheme={isTemporary ? "littleslice" : "slicebox"}
                className="w-full h-14 text-base font-semibold gap-2 rounded-xl shadow-lg"
              >
                {verifying ? (
                  <>
                    <div className="h-5 w-5 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : downloading ? (
                  <>
                    <div className="h-5 w-5 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />
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

          {/* Footer Branding */}
          <div className="mt-8 text-center">
            <Link 
              to={isTemporary ? "/littleslice" : "/slicebox"}
              className="inline-flex items-center gap-2 text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
            >
              <div 
                className="w-4 h-4 rounded flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}50` }}
              >
                {isTemporary ? (
                  <Clock className="h-2.5 w-2.5 text-[#0B0B0B]" />
                ) : (
                  <HardDrive className="h-2.5 w-2.5 text-[#0B0B0B]" />
                )}
              </div>
              A product by {brandName}
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

// Helper function to get file category
function getFileCategory(mimeType: string, fileName?: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (ext === "apk") return "apk";
  
  return "file";
}
