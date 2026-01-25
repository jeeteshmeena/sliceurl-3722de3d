import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FileText, Image, Video, Music, Archive, File, Download, 
  Lock, Eye, EyeOff, ArrowLeft, HardDrive, Clock, AlertTriangle, Shield, Loader2
} from "lucide-react";
import { IsolatedButton, SLICEBOX_COLORS, LITTLESLICE_COLORS } from "@/components/slicebox/IsolatedButton";
import { IsolatedInput } from "@/components/slicebox/IsolatedInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { decryptFile } from "@/lib/encryption";

interface FileMetadata {
  fileId: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  expiresAt: string | null;
  isPasswordProtected: boolean;
  downloadCount: number;
  isEncrypted: boolean;
  encryptionIv: string | null;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return Archive;
  return File;
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
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<FileMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [decrypting, setDecrypting] = useState(false);

  // Extract encryption key from URL fragment (never sent to server)
  const encryptionKey = location.hash ? location.hash.slice(1) : null;

  // Determine if this is a temporary file (LittleSlice) or permanent (SliceBox)
  const isTemporary = file?.expiresAt !== null;
  const accentColor = isTemporary ? "#D0E7EF" : "#FFD64D";
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
          .select("file_id, original_name, file_size, mime_type, storage_path, expires_at, password_hash, download_count, is_deleted, is_encrypted, encryption_iv")
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
          originalName: data.original_name,
          fileSize: data.file_size,
          mimeType: data.mime_type,
          storagePath: data.storage_path,
          expiresAt: data.expires_at,
          isPasswordProtected: !!data.password_hash,
          downloadCount: data.download_count || 0,
          isEncrypted: data.is_encrypted || false,
          encryptionIv: data.encryption_iv || null,
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

    // Check if encrypted file needs key
    if (file.isEncrypted && !encryptionKey) {
      toast.error("Missing decryption key", {
        description: "The download link is incomplete. Please use the full link with the encryption key.",
      });
      return;
    }

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

        // For encrypted files, decrypt client-side
        if (file.isEncrypted && encryptionKey && file.encryptionIv) {
          await downloadAndDecrypt(response.data.downloadUrl);
        } else {
          window.location.href = response.data.downloadUrl;
          toast.success("Download started!");
        }
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
        const errorMessage = response.data?.error || "Download failed";
        if (errorMessage.includes("expired")) {
          toast.error("This file has expired");
        } else if (errorMessage.includes("deleted")) {
          toast.error("This file has been deleted");
        } else if (response.data?.requiresPassword) {
          toast.error("This file requires a password");
        } else {
          toast.error("Failed to download file");
        }
        setDownloading(false);
        return;
      }

      // For encrypted files, fetch and decrypt client-side
      if (file.isEncrypted && encryptionKey && file.encryptionIv) {
        await downloadAndDecrypt(response.data.downloadUrl);
      } else {
        // Non-encrypted file - direct download
        window.location.href = response.data.downloadUrl;
        toast.success("Download started!");
      }
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const downloadAndDecrypt = async (signedUrl: string) => {
    if (!file || !encryptionKey || !file.encryptionIv) return;

    setDecrypting(true);
    try {
      toast.info("Downloading encrypted file...");
      
      // Fetch the encrypted file
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error("Failed to download file");
      
      const encryptedData = await response.arrayBuffer();
      
      toast.info("Decrypting file...");
      
      // Decrypt client-side
      const decryptedData = await decryptFile(encryptedData, encryptionKey, file.encryptionIv);
      
      // Create blob and trigger download
      const blob = new Blob([decryptedData], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("File decrypted and downloaded!");
    } catch (err) {
      console.error("Decryption error:", err);
      toast.error("Failed to decrypt file. The link may be invalid.");
    } finally {
      setDecrypting(false);
    }
  };

  const FileIcon = file ? getFileIcon(file.mimeType) : File;
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
              <div className="h-8 w-8 rounded-lg bg-[#FFD64D] flex items-center justify-center">
                <HardDrive className="h-4 w-4 text-[#0B0B0B]" />
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
              style={{ backgroundColor: accentColor }}
            >
              {isTemporary ? (
                <Clock className="h-4 w-4 text-[#0B0B0B]" />
              ) : (
                <HardDrive className="h-4 w-4 text-[#0B0B0B]" />
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
            {/* File Icon & Info */}
            <div className="p-6 text-center">
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${accentColor}30` }}
              >
                <FileIcon className="h-10 w-10" style={{ color: "#0B0B0B" }} />
              </div>
              <h1 className="text-lg font-bold text-[#0B0B0B] mb-1 break-all">
                {file.originalName}
              </h1>
              <p className="text-sm text-[#6B7280]">
                {formatFileSize(file.fileSize)}
                {file.downloadCount > 0 && ` · ${file.downloadCount} downloads`}
              </p>
              
              {/* Encryption Badge */}
              {file.isEncrypted && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <Shield className="h-3 w-3" />
                  End-to-End Encrypted
                </div>
              )}
              
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

            {/* Missing Key Warning */}
            {file.isEncrypted && !encryptionKey && (
              <div className="px-6 pb-4">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Incomplete Link</span>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    The decryption key is missing. Please use the complete share link.
                  </p>
                </div>
              </div>
            )}

            {/* Password Input (if protected) */}
            {file.isPasswordProtected && (
              <div className="px-6 pb-4">
                <div 
                  className="p-4 rounded-xl border"
                  style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}50` }}
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
                disabled={verifying || downloading || decrypting || (file.isEncrypted && !encryptionKey)}
                colorScheme={isTemporary ? "littleslice" : "slicebox"}
                className="w-full h-12 text-base font-semibold gap-2"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : decrypting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Decrypting...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    {file.isEncrypted ? "Decrypt & Download" : "Download File"}
                  </>
                )}
              </IsolatedButton>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-[#6B7280] mt-6">
            {file.isEncrypted && (
              <span className="flex items-center justify-center gap-1 mb-1">
                <Shield className="h-3 w-3" />
                Decrypted in your browser
              </span>
            )}
            {isTemporary ? "A Product by SliceBox" : "Powered by SliceURL"}
          </p>
        </motion.div>
      </main>
    </div>
  );
}
